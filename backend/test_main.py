from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app
from models import Recipe, RecipeSummary

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@patch("main.store.get_index", new_callable=AsyncMock)
def test_list_recipes(mock_get_index):
    mock_get_index.return_value = [
        RecipeSummary(
            id="1",
            title="Spaghetti alla Carbonara",
            slug="spaghetti-alla-carbonara",
            categories=["primi"],
            source_type="manual",
            created_at="2024-01-01T00:00:00Z",
        )
    ]
    response = client.get("/recipes")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["title"] == "Spaghetti alla Carbonara"


@patch("main.store.get_recipe", new_callable=AsyncMock)
def test_get_recipe(mock_get_recipe):
    mock_get_recipe.return_value = Recipe(
        id="1",
        title="Spaghetti alla Carbonara",
        ingredients=["pasta", "uova", "guanciale"],
    )

    response = client.get("/recipes/1")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Spaghetti alla Carbonara"
    assert "guanciale" in data["ingredients"]


@patch("main.store.get_recipe", new_callable=AsyncMock)
def test_get_recipe_not_found(mock_get_recipe):
    mock_get_recipe.return_value = None
    response = client.get("/recipes/99")
    assert response.status_code == 404


def test_add_recipe_manual_unauthorized():
    response = client.post("/recipes", json={"title": "Test"})
    assert response.status_code == 401


# Example with Authorization header spoofing via dependency override or actual headers
@patch("main.store.save_recipe", new_callable=AsyncMock)
def test_add_recipe_manual_authorized(mock_save_recipe):
    # Dobbiamo overridare la dipendenza o iniettare la api key vera (se presente nel config test)
    # Nel file auth.py di default get_settings().api_key viene letto, usiamo una fake api_key
    with patch("auth.get_settings") as mock_settings:
        mock_settings.return_value.api_key = "test-fake-key"

        response = client.post(
            "/recipes",
            headers={"X-API-Key": "test-fake-key"},
            json={
                "title": "Pasta Fake",
                "ingredients": ["pasta"],
                "steps": ["fai la pasta"],
            },
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Pasta Fake"


@patch("main.store.get_index", new_callable=AsyncMock)
def test_search_keyword(mock_get_index):
    mock_get_index.return_value = [
        RecipeSummary(
            id="1",
            title="Spaghetti alla Carbonara",
            slug="spaghetti-alla-carbonara",
            description="Un classico della cucina romana",
            categories=["primi"],
            source_type="manual",
            created_at="2024-01-01T00:00:00Z",
        ),
        RecipeSummary(
            id="2",
            title="Tiramisù",
            slug="tiramisu",
            categories=["dolci"],
            source_type="manual",
            created_at="2024-01-02T00:00:00Z",
        ),
    ]
    response = client.get("/search?q=carbonara")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["recipe"]["title"] == "Spaghetti alla Carbonara"
    assert data[0]["score"] > 0


@patch("main.store.get_index", new_callable=AsyncMock)
def test_search_no_results(mock_get_index):
    mock_get_index.return_value = [
        RecipeSummary(
            id="1",
            title="Spaghetti alla Carbonara",
            slug="spaghetti-alla-carbonara",
            categories=["primi"],
            source_type="manual",
            created_at="2024-01-01T00:00:00Z",
        ),
    ]
    response = client.get("/search?q=sushi")
    assert response.status_code == 200
    assert response.json() == []


@patch("main.store.delete_recipe", new_callable=AsyncMock)
def test_delete_recipe_authorized(mock_delete):
    mock_delete.return_value = True
    with patch("auth.get_settings") as mock_settings:
        mock_settings.return_value.api_key = "test-fake-key"
        response = client.delete("/recipes/1", headers={"X-API-Key": "test-fake-key"})
        assert response.status_code == 200
        assert response.json()["detail"] == "Ricetta eliminata"


@patch("main.store.delete_recipe", new_callable=AsyncMock)
def test_delete_recipe_not_found(mock_delete):
    mock_delete.return_value = False
    with patch("auth.get_settings") as mock_settings:
        mock_settings.return_value.api_key = "test-fake-key"
        response = client.delete("/recipes/99", headers={"X-API-Key": "test-fake-key"})
        assert response.status_code == 404


def test_delete_recipe_unauthorized():
    response = client.delete("/recipes/1")
    assert response.status_code == 401


@patch("main.store.get_index", new_callable=AsyncMock)
def test_get_categories(mock_get_index):
    mock_get_index.return_value = [
        RecipeSummary(
            id="1",
            title="Spaghetti",
            slug="spaghetti",
            categories=["primi", "veloce"],
            source_type="manual",
            created_at="2024-01-01T00:00:00Z",
        ),
        RecipeSummary(
            id="2",
            title="Tiramisù",
            slug="tiramisu",
            categories=["dolci"],
            source_type="manual",
            created_at="2024-01-02T00:00:00Z",
        ),
    ]
    response = client.get("/categories")
    assert response.status_code == 200
    data = response.json()
    assert "dolci" in data
    assert "primi" in data
    assert "veloce" in data
