from datetime import datetime, timezone
from typing import List

import trafilatura
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from ai_service import extract_recipe, get_query_embedding, get_recipe_embedding
from auth import _verify_google_token, require_auth
from github_store import store
from models import Recipe, RecipeSummary, SearchResult, TextInput, URLInput
from search_service import keyword_search, semantic_search

app = FastAPI(title="Ricette API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Endpoints pubblici ---


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/recipes", response_model=List[RecipeSummary])
async def list_recipes():
    return await store.get_index()


@app.get("/recipes/{recipe_id}", response_model=Recipe)
async def get_recipe(recipe_id: str):
    recipe = await store.get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Ricetta non trovata")
    return recipe


@app.get("/search", response_model=List[SearchResult])
async def search(q: str, semantic: bool = True, limit: int = 10):
    index = await store.get_index()
    index_map = {r.id: r for r in index}

    if semantic:
        query_emb = await get_query_embedding(q)
        results = await semantic_search(query_emb, top_k=limit)
    else:
        results = await keyword_search(q, index)
        results = results[:limit]

    output = []
    for recipe_id, score in results:
        if recipe_id in index_map:
            output.append(SearchResult(recipe=index_map[recipe_id], score=score))
    return output


@app.get("/categories")
async def get_categories():
    index = await store.get_index()
    cats: set[str] = set()
    for r in index:
        cats.update(r.categories)
    return sorted(cats)


# --- Auth endpoint ---


@app.get("/auth/me")
async def auth_me(request: Request):
    """Verify Google token and return user info."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token assente")
    token = auth_header[7:]
    idinfo = _verify_google_token(token)
    return {
        "email": idinfo.get("email"),
        "name": idinfo.get("name"),
        "picture": idinfo.get("picture"),
    }


# --- Endpoints protetti (richiedono autenticazione) ---


@app.post("/recipes/from-url", response_model=Recipe, dependencies=[Depends(require_auth)])
async def add_recipe_from_url(data: URLInput):
    html = trafilatura.fetch_url(data.url)
    if not html:
        raise HTTPException(status_code=422, detail="Impossibile scaricare la pagina")

    text = trafilatura.extract(html, include_images=True, include_links=True)

    # --- Fallback e Safety Net per blocchi Ricetta Spesso Ignorati ---
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    # WP Recipe Maker, Recipe Cards generiche
    containers = soup.select(".wprm-recipe-container, [class*='recipe-container'], [class*='recipe-card']")

    extra_text = ""
    for c in containers:
        for img in c.find_all("img"):
            src = img.get("src") or img.get("data-src", "")
            if src:
                alt = img.get("alt", "immagine")
                img.replace_with(f" ![{alt}]({src}) ")
        for a in c.find_all("a"):
            href = a.get("href", "")
            if href:
                a.replace_with(f" [{a.get_text()}]({href}) ")

        extra_text += c.get_text(separator="\n", strip=True) + "\n\n"

    for script in soup.find_all("script", type="application/ld+json"):
        extra_text += "\n\n--- JSON-LD STRUCTURED DATA ---\n"
        extra_text += script.get_text(strip=True) + "\n"

    if extra_text:
        text = (text or "") + "\n\n--- EXTRA CONTENUTI RAW ---\n\n" + extra_text

    if not text:
        raise HTTPException(status_code=422, detail="Impossibile estrarre il contenuto")

    extracted = await extract_recipe(text)
    extracted["source_url"] = data.url
    extracted["source_type"] = "url"

    recipe = Recipe(**extracted)
    embedding = await get_recipe_embedding(extracted)

    await store.save_recipe(recipe)
    embeddings = await store.get_embeddings()
    embeddings[recipe.id] = {"title": recipe.title, "embedding": embedding}
    await store.save_embeddings(embeddings)

    return recipe


@app.post("/recipes/from-text", response_model=Recipe, dependencies=[Depends(require_auth)])
async def add_recipe_from_text(data: TextInput):
    extracted = await extract_recipe(data.text)
    extracted["source_type"] = "text"

    recipe = Recipe(**extracted)
    embedding = await get_recipe_embedding(extracted)

    await store.save_recipe(recipe)
    embeddings = await store.get_embeddings()
    embeddings[recipe.id] = {"title": recipe.title, "embedding": embedding}
    await store.save_embeddings(embeddings)

    return recipe


@app.post("/recipes", response_model=Recipe, dependencies=[Depends(require_auth)])
async def add_recipe_manual(recipe: Recipe):
    embedding = await get_recipe_embedding(recipe.model_dump())

    await store.save_recipe(recipe)
    embeddings = await store.get_embeddings()
    embeddings[recipe.id] = {"title": recipe.title, "embedding": embedding}
    await store.save_embeddings(embeddings)

    return recipe


@app.put(
    "/recipes/{recipe_id}",
    response_model=Recipe,
    dependencies=[Depends(require_auth)],
)
async def update_recipe(recipe_id: str, recipe: Recipe):
    existing = await store.get_recipe(recipe_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Ricetta non trovata")

    recipe.id = recipe_id
    recipe.updated_at = datetime.now(timezone.utc).isoformat()

    embedding = await get_recipe_embedding(recipe.model_dump())
    await store.save_recipe(recipe)

    embeddings = await store.get_embeddings()
    embeddings[recipe_id] = {"title": recipe.title, "embedding": embedding}
    await store.save_embeddings(embeddings)

    return recipe


@app.delete("/recipes/{recipe_id}", dependencies=[Depends(require_auth)])
async def delete_recipe(recipe_id: str):
    deleted = await store.delete_recipe(recipe_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Ricetta non trovata")

    embeddings = await store.get_embeddings()
    embeddings.pop(recipe_id, None)
    await store.save_embeddings(embeddings)

    return {"detail": "Ricetta eliminata"}


@app.post("/admin/rebuild-index", dependencies=[Depends(require_auth)])
async def rebuild_index():
    count = await store.rebuild_index()
    return {"rebuilt": count}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
