import asyncio

import httpx

from ai_service import extract_recipe
from github_store import store
from models import Recipe


async def import_legacy_recipes():
    print("Inizio recupero albero repository vecchio...")
    url = "https://api.github.com/repos/cekk/recipes-old/git/trees/master?recursive=1"
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
        r.raise_for_status()
        tree = r.json().get("tree", [])

    yml_files = [
        item
        for item in tree
        if item["path"].startswith("data/") and item["path"].endswith(".yml")
    ]
    jpg_files = {
        item["path"]
        for item in tree
        if item["path"].startswith("data/") and item["path"].endswith(".jpg")
    }

    print(
        f"Trovati {len(yml_files)} file .yml storici. Inizio processo migrazione tramite AI...\n"
    )

    for f in yml_files:
        print(f"Scaricando e analizzando: {f['path']} ...")
        # Fetch actual file content via blob SHA or raw URL
        raw_url = (
            f"https://raw.githubusercontent.com/cekk/recipes-old/master/{f['path']}"
        )

        async with httpx.AsyncClient() as client:
            r = await client.get(raw_url)
            r.raise_for_status()
            content_yaml = r.text

        # Passiamo il testo YAML al prompt esistente di Gemini
        print(" -> Invio a Gemini per ristrutturazione...")
        extracted = await extract_recipe(
            f"Questo è un file YAML contenente una ricetta.\n\n{content_yaml}"
        )

        target_jpg = f["path"].replace(".yml", ".jpg")
        if target_jpg in jpg_files:
            extracted["image_urls"] = [
                f"https://raw.githubusercontent.com/cekk/recipes-old/master/{target_jpg}"
            ]
        else:
            extracted["image_urls"] = [
                "https://raw.githubusercontent.com/cekk/recipes-old/master/data/default.jpg"
            ]

        extracted["source_type"] = "manual"

        # Salviamo la ricetta
        recipe = Recipe(**extracted)
        print(" -> Salvataggio su storage...")
        await store.save_recipe(recipe)

        print(f"✓ Completato: {recipe.title}\n")

    print("Migrazione globale terminata con successo!")


if __name__ == "__main__":
    asyncio.run(import_legacy_recipes())
