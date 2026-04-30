from models import RecipeSummary


async def keyword_search(
    query: str, index: list[RecipeSummary]
) -> list[tuple[str, float]]:
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
