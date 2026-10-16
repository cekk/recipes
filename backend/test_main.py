import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
from fastapi.testclient import TestClient

import bot
from instagram_service import normalize_instagram_url, parse_instagram_html
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


def test_health_head():
    response = client.head("/health")
    assert response.status_code == 200


@patch("main.process_update", new_callable=AsyncMock)
def test_telegram_webhook_missing_secret(mock_process):
    response = client.post("/telegram/webhook", json={"update_id": 1})
    assert response.status_code == 403
    mock_process.assert_not_called()


@patch("main.process_update", new_callable=AsyncMock)
def test_telegram_webhook_wrong_secret(mock_process):
    response = client.post(
        "/telegram/webhook",
        json={"update_id": 1},
        headers={"X-Telegram-Bot-Api-Secret-Token": "wrong"},
    )
    assert response.status_code == 403
    mock_process.assert_not_called()


@patch("main.process_update", new_callable=AsyncMock)
def test_telegram_webhook_valid_secret(mock_process):
    response = client.post(
        "/telegram/webhook",
        json={"update_id": 1},
        headers={"X-Telegram-Bot-Api-Secret-Token": bot.webhook_secret()},
    )
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    mock_process.assert_called_once()


def test_process_update_dedup():
    mock_app = MagicMock()
    mock_app.update_queue.put = AsyncMock()
    old_app = bot._application
    bot._application = mock_app
    bot._seen_update_ids.clear()
    bot._seen_update_ids_set.clear()
    try:
        with patch("bot.Update.de_json", return_value=MagicMock()):
            asyncio.run(bot.process_update({"update_id": 111}))
            asyncio.run(bot.process_update({"update_id": 111}))
            assert mock_app.update_queue.put.await_count == 1
            asyncio.run(bot.process_update({"update_id": 112}))
            assert mock_app.update_queue.put.await_count == 2
    finally:
        bot._application = old_app
        bot._seen_update_ids.clear()
        bot._seen_update_ids_set.clear()


def _update_for_user(user_id):
    update = MagicMock()
    update.effective_user.id = user_id
    return update


def test_is_allowed():
    with patch("bot.get_settings", return_value=SimpleNamespace(telegram_allowed_user_id=0)):
        assert bot._is_allowed(_update_for_user(42)) is False
    with patch("bot.get_settings", return_value=SimpleNamespace(telegram_allowed_user_id=42)):
        assert bot._is_allowed(_update_for_user(42)) is True
        assert bot._is_allowed(_update_for_user(7)) is False


# --- Instagram ---

IG_REEL = "https://www.instagram.com/reel/DeT0hAqBIp6/"
IG_CAPTION = "È ARRIVATO il momento della schiacciata di zucca!\nIngredienti: 500 g zucca, 300 g farina #ricettezucca"
IG_HTML = (
    "<html><head>"
    '<meta name="description" content="10K likes, 151 comments - claudiamanciniph on October 10, 2026: '
    "&quot;È ARRIVATO il momento della schiacciata di zucca!\nIngredienti: 500 g zucca, 300 g farina "
    '#ricettezucca&quot;. " />'
    '<meta property="og:image" content="https://scontent.cdninstagram.com/x.jpg?sig=1" />'
    '<meta name="twitter:title" content="Claudia | Food (&#064;claudiamanciniph) &#x2022; Instagram reel" />'
    "</head><body></body></html>"
)


def test_normalize_instagram_url():
    assert normalize_instagram_url(IG_REEL + "?obrf=aHM1Z3JzOGR6cWht") == IG_REEL
    assert normalize_instagram_url("https://www.instagram.com/claudiamanciniph/reel/DeT0hAqBIp6/") == IG_REEL
    assert normalize_instagram_url("https://instagram.com/p/ABC123/?igsh=xyz") == "https://www.instagram.com/p/ABC123/"
    assert normalize_instagram_url("https://www.instagram.com/reels/DeT0hAqBIp6") == IG_REEL
    assert normalize_instagram_url("https://www.instagram.com/claudiamanciniph/") is None
    assert normalize_instagram_url("https://example.com/reel/DeT0hAqBIp6/") is None


def test_parse_instagram_html():
    post = parse_instagram_html(IG_HTML, IG_REEL)
    assert post is not None
    assert post.caption == IG_CAPTION
    assert post.author == "claudiamanciniph"
    assert post.image_url == "https://scontent.cdninstagram.com/x.jpg?sig=1"
    assert post.is_video is True


def test_parse_instagram_html_no_caption():
    assert parse_instagram_html("<html><head></head></html>", IG_REEL) is None
    short = '<meta name="description" content="1 like - a on b: &quot;ciao&quot;. " />'
    assert parse_instagram_html(short, IG_REEL) is None


def _ig_post():
    from instagram_service import InstagramPost

    return InstagramPost(
        canonical_url=IG_REEL, caption=IG_CAPTION, author="claudiamanciniph", image_url="https://x/i.jpg", is_video=True
    )


def _post_ig(url=IG_REEL + "?obrf=x"):
    with patch("auth.get_settings") as mock_settings:
        mock_settings.return_value.api_key = "fake-api-key"
        return client.post("/recipes/from-url", headers={"X-API-Key": "fake-api-key"}, json={"url": url})


@patch("main._validate_url")
@patch("main.store.save_recipe", new_callable=AsyncMock)
@patch("main.store.save_image", new_callable=AsyncMock)
@patch("main.store.get_index", new_callable=AsyncMock)
@patch("main.extract_recipe", new_callable=AsyncMock)
@patch("main.download_image", new_callable=AsyncMock)
@patch("main.fetch_instagram_post", new_callable=AsyncMock)
def test_from_url_instagram_ok(mock_fetch, mock_dl, mock_extract, mock_index, mock_save_image, mock_save, _v):
    mock_index.return_value = []
    mock_fetch.return_value = _ig_post()
    mock_dl.return_value = (b"img", "image/jpeg")
    mock_extract.return_value = {"title": "Schiacciata di zucca", "image_urls": ["http://invented"]}
    mock_save_image.return_value = "https://raw.githubusercontent.com/u/r/main/images/abc.jpg"

    response = _post_ig()
    assert response.status_code == 200
    body = response.json()
    assert body["source_url"] == IG_REEL
    assert body["source_type"] == "instagram"
    assert body["video_urls"] == [IG_REEL]
    assert body["image_urls"] == ["https://raw.githubusercontent.com/u/r/main/images/abc.jpg"]
    assert "@claudiamanciniph" in mock_extract.call_args.args[0]
    mock_save.assert_called_once()


@patch("main._validate_url")
@patch("main.store.save_recipe", new_callable=AsyncMock)
@patch("main.store.get_index", new_callable=AsyncMock)
@patch("main.fetch_instagram_post", new_callable=AsyncMock)
def test_from_url_instagram_no_caption(mock_fetch, mock_index, mock_save, _v):
    mock_index.return_value = []
    mock_fetch.return_value = None
    response = _post_ig()
    assert response.status_code == 422
    assert "didascalia" in response.json()["detail"]
    mock_save.assert_not_called()


@patch("main._validate_url")
@patch("main.store.save_recipe", new_callable=AsyncMock)
@patch("main.store.get_index", new_callable=AsyncMock)
@patch("main.fetch_instagram_post", new_callable=AsyncMock)
def test_from_url_instagram_duplicate(mock_fetch, mock_index, mock_save, _v):
    mock_index.return_value = [
        RecipeSummary(
            id="1",
            title="Zucca",
            slug="zucca",
            source_url=IG_REEL + "?igsh=other",
            source_type="instagram",
            created_at="2026-01-01",
        )
    ]
    response = _post_ig()
    assert response.status_code == 409
    mock_fetch.assert_not_called()
    mock_save.assert_not_called()


@patch("main._validate_url")
@patch("main.store.save_recipe", new_callable=AsyncMock)
@patch("main.store.get_index", new_callable=AsyncMock)
@patch("main.extract_recipe", new_callable=AsyncMock)
@patch("main.fetch_instagram_post", new_callable=AsyncMock)
def test_from_url_instagram_no_recipe_in_caption(mock_fetch, mock_extract, mock_index, mock_save, _v):
    mock_index.return_value = []
    mock_fetch.return_value = _ig_post()
    mock_extract.return_value = {"title": None, "ingredients": [], "steps": []}
    response = _post_ig()
    assert response.status_code == 422
    assert "screenshot" in response.json()["detail"]
    mock_save.assert_not_called()


@patch("main.store.save_recipe", new_callable=AsyncMock)
@patch("main.store.get_index", new_callable=AsyncMock)
@patch("main.extract_recipe", new_callable=AsyncMock)
def test_from_text_no_recipe(mock_extract, mock_index, mock_save):
    mock_index.return_value = []
    mock_extract.return_value = {"title": None}
    with patch("auth.get_settings") as mock_settings:
        mock_settings.return_value.api_key = "fake-api-key"
        response = client.post("/recipes/from-text", headers={"X-API-Key": "fake-api-key"}, json={"text": "ciao"})
    assert response.status_code == 422
    mock_save.assert_not_called()


@patch("main._validate_url")
@patch("main.store.save_recipe", new_callable=AsyncMock)
@patch("main.store.save_image", new_callable=AsyncMock)
@patch("main.store.get_index", new_callable=AsyncMock)
@patch("main.extract_recipe", new_callable=AsyncMock)
@patch("main.download_image", new_callable=AsyncMock)
@patch("main.fetch_instagram_post", new_callable=AsyncMock)
def test_from_url_instagram_image_download_fails(
    mock_fetch, mock_dl, mock_extract, mock_index, mock_save_image, mock_save, _v
):
    mock_index.return_value = []
    mock_fetch.return_value = _ig_post()
    mock_dl.return_value = None
    mock_extract.return_value = {"title": "Schiacciata di zucca"}

    response = _post_ig()
    assert response.status_code == 200
    assert response.json()["image_urls"] == []
    mock_save_image.assert_not_called()
    mock_save.assert_called_once()


# --- Screenshot import ---


def _post_images(files, text=None, auth=True):
    data = {"text": text} if text else None
    headers = {"X-API-Key": "fake-api-key"} if auth else {}
    with patch("auth.get_settings") as mock_settings:
        mock_settings.return_value.api_key = "fake-api-key"
        return client.post("/recipes/from-images", headers=headers, files=files, data=data)


def _img_files(n, content_type="image/jpeg"):
    return [("files", (f"{i}.jpg", b"fake-bytes", content_type)) for i in range(n)]


@patch("main.store.save_recipe", new_callable=AsyncMock)
@patch("main.store.get_index", new_callable=AsyncMock)
@patch("main.extract_recipe_from_images", new_callable=AsyncMock)
def test_from_images_ok(mock_extract, mock_index, mock_save):
    mock_index.return_value = []
    mock_extract.return_value = {"title": "Schiacciata di zucca", "image_urls": ["http://invented"]}

    response = _post_images(_img_files(2), text="dalla didascalia")
    assert response.status_code == 200
    body = response.json()
    assert body["source_type"] == "screenshot"
    assert body["image_urls"] == []
    images, text = mock_extract.call_args.args
    assert len(images) == 2
    assert images[0] == (b"fake-bytes", "image/jpeg")
    assert text == "dalla didascalia"
    mock_save.assert_called_once()


def test_from_images_unauthorized():
    assert _post_images(_img_files(1), auth=False).status_code == 401


def test_from_images_no_files():
    assert _post_images(None, text="solo testo").status_code == 422


def test_from_images_too_many_files():
    assert _post_images(_img_files(6)).status_code == 422


def test_from_images_not_an_image():
    assert _post_images(_img_files(1, content_type="text/plain")).status_code == 422


@patch("main.store.save_recipe", new_callable=AsyncMock)
@patch("main.store.get_index", new_callable=AsyncMock)
@patch("main.extract_recipe_from_images", new_callable=AsyncMock)
def test_from_images_duplicate(mock_extract, mock_index, mock_save):
    mock_extract.return_value = {"title": "Schiacciata di zucca"}
    mock_index.return_value = [MagicMock(slug="schiacciata-di-zucca")]
    assert _post_images(_img_files(1)).status_code == 409
    mock_save.assert_not_called()


def test_media_group_batches_photos():
    async def run():
        flush = AsyncMock()
        msg = MagicMock()
        for i in range(3):
            bot._add_to_media_group("g1", msg, f"img{i}".encode(), "cap" if i == 0 else None, flush, delay=0.05)
        flush.assert_not_called()
        await asyncio.sleep(0.2)
        return flush

    flush = asyncio.run(run())
    flush.assert_awaited_once()
    _, images, caption = flush.await_args.args
    assert images == [b"img0", b"img1", b"img2"]
    assert caption == "cap"
    assert "g1" not in bot._media_groups


def _post_text(text="ricetta"):
    with patch("auth.get_settings") as mock_settings:
        mock_settings.return_value.api_key = "fake-api-key"
        return TestClient(app, raise_server_exceptions=False).post(
            "/recipes/from-text", headers={"X-API-Key": "fake-api-key"}, json={"text": text}
        )


@patch("main.extract_recipe", new_callable=AsyncMock)
def test_gemini_unavailable_returns_503_with_detail(mock_extract):
    from google.genai import errors

    mock_extract.side_effect = errors.ServerError(
        503, {"error": {"code": 503, "message": "high demand", "status": "UNAVAILABLE"}}
    )
    response = _post_text()
    assert response.status_code == 503
    assert "high demand" in response.json()["detail"]


@patch("main.extract_recipe", new_callable=AsyncMock)
def test_unhandled_error_returns_detail(mock_extract):
    mock_extract.side_effect = RuntimeError("boom")
    response = _post_text()
    assert response.status_code == 500
    assert response.json()["detail"] == "RuntimeError: boom"


def _bot_reply(response: httpx.Response, frontend_url=""):
    message = MagicMock()
    message.reply_text = AsyncMock()

    async def call():
        return response

    with patch("bot.get_settings", return_value=SimpleNamespace(frontend_url=frontend_url)):
        asyncio.run(bot._reply_with_result(message, call))
    return message.reply_text.call_args.args[0]


def _http_response(status, json):
    return httpx.Response(status, json=json, request=httpx.Request("POST", "http://test/recipes/from-url"))


def test_bot_confirmation_includes_recipe_link():
    text = _bot_reply(_http_response(200, {"id": "abc", "title": "Pancake"}), "https://ricette.example/")
    assert "https://ricette.example/recipe/abc" in text


def test_bot_confirmation_without_frontend_url():
    text = _bot_reply(_http_response(200, {"id": "abc", "title": "Pancake"}))
    assert "/recipe/" not in text


def test_bot_shows_error_detail():
    text = _bot_reply(_http_response(503, {"detail": "Gemini non disponibile"}))
    assert text == "❌ Errore API 503: Gemini non disponibile"
