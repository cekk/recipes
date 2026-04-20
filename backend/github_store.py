import base64
import json
from typing import List, Optional

import httpx

from config import get_settings
from models import Recipe, RecipeSummary

GITHUB_API = "https://api.github.com"


class GitHubStore:
    def __init__(self):
        s = get_settings()
        self.repo = s.github_repo
        self.branch = s.github_branch
        self.headers = {
            "Authorization": f"Bearer {s.github_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    async def _get_file(self, path: str) -> Optional[dict]:
        url = f"{GITHUB_API}/repos/{self.repo}/contents/{path}"
        async with httpx.AsyncClient() as client:
            r = await client.get(url, headers=self.headers, params={"ref": self.branch})
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()

    async def _put_file(self, path: str, content: str, message: str, sha: Optional[str] = None):
        url = f"{GITHUB_API}/repos/{self.repo}/contents/{path}"
        body = {
            "message": message,
            "content": base64.b64encode(content.encode()).decode(),
            "branch": self.branch,
        }
        if sha:
            body["sha"] = sha
        async with httpx.AsyncClient() as client:
            r = await client.put(url, headers=self.headers, json=body)
        r.raise_for_status()

    async def _delete_file(self, path: str, message: str, sha: str):
        url = f"{GITHUB_API}/repos/{self.repo}/contents/{path}"
        body = {"message": message, "sha": sha, "branch": self.branch}
        async with httpx.AsyncClient() as client:
            r = await client.request("DELETE", url, headers=self.headers, json=body)
        r.raise_for_status()

    # --- Index ---

    async def get_index(self) -> List[RecipeSummary]:
        file = await self._get_file("index.json")
        if not file:
            return []
        data = json.loads(base64.b64decode(file["content"]).decode())
        return [RecipeSummary(**r) for r in data]

    async def _save_index(self, summaries: List[RecipeSummary]):
        file = await self._get_file("index.json")
        sha = file["sha"] if file else None
        content = json.dumps([s.model_dump() for s in summaries], ensure_ascii=False, indent=2)
        await self._put_file("index.json", content, "Aggiorna indice ricette", sha)

    async def rebuild_index(self) -> int:
        """Ricostruisce l'indice leggendo tutti i file individuali delle ricette."""
        url = f"{GITHUB_API}/repos/{self.repo}/contents/recipes"
        async with httpx.AsyncClient() as client:
            r = await client.get(url, headers=self.headers, params={"ref": self.branch})
        if r.status_code == 404:
            return 0
        r.raise_for_status()
        files = r.json()
        summaries = []
        for f in files:
            if f["name"].endswith(".json"):
                recipe_id = f["name"].replace(".json", "")
                recipe = await self.get_recipe(recipe_id)
                if recipe:
                    summaries.append(recipe.to_summary())
        await self._save_index(summaries)
        return len(summaries)

    # --- Recipes ---

    async def get_recipe(self, recipe_id: str) -> Optional[Recipe]:
        file = await self._get_file(f"recipes/{recipe_id}.json")
        if not file:
            return None
        data = json.loads(base64.b64decode(file["content"]).decode())
        return Recipe(**data)

    async def save_recipe(self, recipe: Recipe) -> Recipe:
        path = f"recipes/{recipe.id}.json"
        existing = await self._get_file(path)
        sha = existing["sha"] if existing else None
        verb = "Aggiorna" if sha else "Aggiunge"
        await self._put_file(
            path,
            recipe.model_dump_json(indent=2),
            f"{verb} ricetta: {recipe.title}",
            sha,
        )
        index = await self.get_index()
        index = [s for s in index if s.id != recipe.id]
        index.insert(0, recipe.to_summary())
        await self._save_index(index)
        return recipe

    async def delete_recipe(self, recipe_id: str) -> bool:
        path = f"recipes/{recipe_id}.json"
        file = await self._get_file(path)
        if not file:
            return False
        await self._delete_file(path, f"Elimina ricetta {recipe_id}", file["sha"])
        index = await self.get_index()
        index = [s for s in index if s.id != recipe_id]
        await self._save_index(index)
        return True

    # --- Embeddings ---

    async def get_embeddings(self) -> dict:
        file = await self._get_file("embeddings.json")
        if not file:
            return {}
        return json.loads(base64.b64decode(file["content"]).decode())

    async def save_embeddings(self, embeddings: dict):
        existing = await self._get_file("embeddings.json")
        sha = existing["sha"] if existing else None
        content = json.dumps(embeddings, ensure_ascii=False)
        await self._put_file("embeddings.json", content, "Aggiorna embeddings", sha)


store = GitHubStore()
