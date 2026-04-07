import math
from typing import List, Tuple
from models import RecipeSummary
from github_store import store


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


async def semantic_search(
    query_embedding: list[float], top_k: int = 10
) -> List[Tuple[str, float]]:
    embeddings = await store.get_embeddings()
    scores = []
    for recipe_id, data in embeddings.items():
        emb = data.get("embedding", [])
        if emb:
            score = _cosine_similarity(query_embedding, emb)
            scores.append((recipe_id, score))
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:top_k]


async def keyword_search(
    query: str, index: List[RecipeSummary]
) -> List[Tuple[str, float]]:
    q = query.lower()
    results = []
    for recipe in index:
        score = 0.0
        if q in recipe.title.lower():
            score += 1.0
        if recipe.description and q in recipe.description.lower():
            score += 0.5
        for cat in recipe.categories:
            if q in cat.lower():
                score += 0.3
        if score > 0:
            results.append((recipe.id, score))
    results.sort(key=lambda x: x[1], reverse=True)
    return results
