import asyncio
import ipaddress
import secrets
import socket
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from urllib.parse import urlparse

import trafilatura
from bs4 import BeautifulSoup
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google.genai import errors as genai_errors
from pydantic import ValidationError

from ai_service import extract_recipe, extract_recipe_from_images
from auth import _verify_google_token, require_auth
from bot import process_update, setup_webhook, shutdown_webhook, webhook_secret
from config import get_settings
from github_store import store
from instagram_service import (
    download_image,
    fetch_instagram_post,
    is_instagram_url,
    normalize_instagram_url,
)
from models import Recipe, RecipeSummary, SearchResult, TextInput, URLInput
from search_service import keyword_search


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: setup Telegram webhook if configured
    settings = get_settings()
    if settings.telegram_bot_token and settings.backend_url:
        await setup_webhook(settings.backend_url)
    yield
    # Shutdown: cleanup
    await shutdown_webhook()


app = FastAPI(title="Ricette API", version="1.0.0", lifespan=lifespan)

_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_settings_origins = get_settings().allowed_origins
if _settings_origins:
    _ALLOWED_ORIGINS.extend(o.strip() for o in _settings_origins.split(",") if o.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(genai_errors.APIError)
async def _gemini_error_handler(request: Request, exc: genai_errors.APIError):
    print(f"Errore Gemini su {request.url.path}: {exc}")
    status = 503 if exc.code in (429, 500, 502, 503, 504) else 502
    return JSONResponse(
        status_code=status,
        content={"detail": f"Gemini non disponibile ({exc.code} {exc.status}): {exc.message}. Riprova tra poco."},
    )


@app.exception_handler(Exception)
async def _unhandled_error_handler(request: Request, exc: Exception):
    # Starlette re-raises after this handler, so the traceback still reaches the logs
    return JSONResponse(status_code=500, content={"detail": f"{type(exc).__name__}: {exc}"})


def _validate_url(url: str) -> str:
    """Validate URL to prevent SSRF attacks."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=422, detail="Solo URL HTTP/HTTPS sono supportati")
    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=422, detail="URL non valido")
    try:
        resolved = socket.getaddrinfo(hostname, None)
        for _, _, _, _, addr in resolved:
            ip = ipaddress.ip_address(addr[0])
            if ip.is_private or ip.is_loopback or ip.is_reserved:
                raise HTTPException(status_code=422, detail="URL verso indirizzi privati non consentiti")
    except socket.gaierror:
        raise HTTPException(status_code=422, detail="Impossibile risolvere l'hostname")
    return url


# --- Endpoints pubblici ---


@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok"}


@app.get("/recipes", response_model=list[RecipeSummary])
async def list_recipes():
    return await store.get_index()


@app.get("/recipes/{recipe_id}", response_model=Recipe)
async def get_recipe(recipe_id: str):
    recipe = await store.get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Ricetta non trovata")
    return recipe


@app.get("/search", response_model=list[SearchResult])
async def search(q: str, limit: int = 10):
    index = await store.get_index()
    index_map = {r.id: r for r in index}

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


_NO_RECIPE_DETAIL = "Non ho trovato una ricetta nel contenuto ricevuto."


def _build_recipe(extracted: dict, detail: str = _NO_RECIPE_DETAIL) -> Recipe:
    """Build a Recipe from the AI output; 422 when the model found no usable recipe (e.g. title null)."""
    try:
        return Recipe(**extracted)
    except ValidationError as exc:
        print(f"Estrazione ricetta non valida: {exc.errors()}")
        raise HTTPException(status_code=422, detail=detail) from exc


async def _add_recipe_from_instagram(url: str) -> Recipe:
    canonical = normalize_instagram_url(url)
    if canonical is None:
        raise HTTPException(status_code=422, detail="Link Instagram non riconosciuto (serve un post o un reel)")

    index = await store.get_index()
    for summary in index:
        if summary.source_url and normalize_instagram_url(summary.source_url) == canonical:
            raise HTTPException(status_code=409, detail="Ricetta già presente (URL duplicato)")

    post = await fetch_instagram_post(canonical)
    if post is None:
        raise HTTPException(
            status_code=422,
            detail="Non riesco a leggere la didascalia del post Instagram. "
            "Manda uno screenshot o incolla il testo della ricetta.",
        )

    content = post.caption
    if post.author:
        content = f"Autore: @{post.author}\n\n{content}"
    extracted = await extract_recipe(content)
    if not extracted.get("title"):
        print(f"Nessuna ricetta nella didascalia Instagram {canonical}: {post.caption[:300]!r}")

    recipe = _build_recipe(
        extracted,
        "Non ho trovato una ricetta nella didascalia del post Instagram. "
        "Manda uno screenshot o incolla il testo della ricetta.",
    )
    recipe.source_url = canonical
    recipe.source_type = "instagram"
    recipe.video_urls = [canonical] if post.is_video else []
    recipe.image_urls = []

    if post.image_url:
        try:
            downloaded = await download_image(post.image_url)
            if downloaded:
                data, content_type = downloaded
                ext = {"image/png": "png", "image/webp": "webp"}.get(content_type, "jpg")
                recipe.image_urls = [await store.save_image(recipe.id, data, ext)]
        except Exception as exc:
            print(f"Impossibile salvare la copertina Instagram: {exc}")

    await store.save_recipe(recipe)
    return recipe


@app.post("/recipes/from-url", response_model=Recipe, dependencies=[Depends(require_auth)])
async def add_recipe_from_url(data: URLInput):
    _validate_url(data.url)

    if is_instagram_url(data.url):
        return await _add_recipe_from_instagram(data.url)

    # Check if URL already exists
    index = await store.get_index()
    for summary in index:
        if summary.source_url and summary.source_url.strip("/") == data.url.strip("/"):
            raise HTTPException(status_code=409, detail="Ricetta già presente (URL duplicato)")

    html = await asyncio.to_thread(trafilatura.fetch_url, data.url)
    if not html:
        raise HTTPException(status_code=422, detail="Impossibile scaricare la pagina")

    text = trafilatura.extract(html, include_images=True, include_links=True)

    # --- Fallback e Safety Net per blocchi Ricetta Spesso Ignorati ---
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

    recipe = _build_recipe(extracted)
    await store.save_recipe(recipe)
    return recipe


@app.post("/recipes/from-text", response_model=Recipe, dependencies=[Depends(require_auth)])
async def add_recipe_from_text(data: TextInput):
    extracted = await extract_recipe(data.text)
    extracted["source_type"] = "text"

    recipe = _build_recipe(extracted)

    # Controlla duplicati per titolo (slug)
    index = await store.get_index()
    for summary in index:
        if summary.slug == recipe.slug:
            raise HTTPException(status_code=409, detail="Ricetta già presente (Titolo duplicato)")

    await store.save_recipe(recipe)
    return recipe


_MAX_IMAGES = 5
_MAX_IMAGE_BYTES = 10 * 1024 * 1024


@app.post("/recipes/from-images", response_model=Recipe, dependencies=[Depends(require_auth)])
async def add_recipe_from_images(files: list[UploadFile] = File(default=[]), text: str | None = Form(None)):
    if not files:
        raise HTTPException(status_code=422, detail="Nessuna immagine ricevuta")
    if len(files) > _MAX_IMAGES:
        raise HTTPException(status_code=422, detail=f"Troppe immagini (massimo {_MAX_IMAGES})")

    images: list[tuple[bytes, str]] = []
    for f in files:
        mime = f.content_type or ""
        if not mime.startswith("image/"):
            raise HTTPException(status_code=422, detail="Sono accettati solo file immagine")
        data = await f.read(_MAX_IMAGE_BYTES + 1)
        if len(data) > _MAX_IMAGE_BYTES:
            raise HTTPException(status_code=422, detail="Immagine troppo grande (massimo 10 MB)")
        images.append((data, mime))

    extracted = await extract_recipe_from_images(images, (text or "").strip() or None)
    extracted["source_type"] = "screenshot"
    extracted["image_urls"] = []

    recipe = _build_recipe(extracted)

    index = await store.get_index()
    for summary in index:
        if summary.slug == recipe.slug:
            raise HTTPException(status_code=409, detail="Ricetta già presente (Titolo duplicato)")

    await store.save_recipe(recipe)
    return recipe


@app.post("/recipes", response_model=Recipe, dependencies=[Depends(require_auth)])
async def add_recipe_manual(recipe: Recipe):
    await store.save_recipe(recipe)
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

    await store.save_recipe(recipe)
    return recipe


@app.delete("/recipes/{recipe_id}", dependencies=[Depends(require_auth)])
async def delete_recipe(recipe_id: str):
    deleted = await store.delete_recipe(recipe_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Ricetta non trovata")
    return {"detail": "Ricetta eliminata"}


@app.post("/admin/rebuild-index", dependencies=[Depends(require_auth)])
async def rebuild_index():
    count = await store.rebuild_index()
    return {"rebuilt": count}


@app.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    token = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if not secrets.compare_digest(token.encode(), webhook_secret().encode()):
        raise HTTPException(status_code=403, detail="Forbidden")
    payload = await request.json()
    await process_update(payload)
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
