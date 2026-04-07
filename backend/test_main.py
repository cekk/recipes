import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from main import app
from models import RecipeSummary, Recipe

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
@patch("main.store.get_embeddings", new_callable=AsyncMock)
@patch("main.store.save_embeddings", new_callable=AsyncMock)
@patch("main.get_recipe_embedding", new_callable=AsyncMock)
def test_add_recipe_manual_authorized(mock_embedding, mock_save_emb, mock_get_emb, mock_save_recipe):
    # Dobbiamo overridare la dipendenza o iniettare la api key vera (se presente nel config test)
    # Nel file auth.py di default get_settings().api_key viene letto, usiamo una fake api_key
    with patch("auth.get_settings") as mock_settings:
        mock_settings.return_value.api_key = "test-fake-key"
        
        mock_embedding.return_value = [0.1, 0.2, 0.3]
        mock_get_emb.return_value = {}

        response = client.post(
            "/recipes", 
            headers={"X-API-Key": "test-fake-key"},
            json={
                "title": "Pasta Fake",
                "ingredients": ["pasta"],
                "steps": ["fai la pasta"]
            }
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Pasta Fake"
