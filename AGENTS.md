# Copilot Instructions — Ricette

Personal recipe web app using FastAPI + React. Recipes are stored as versioned JSON files in a GitHub repository. AI extraction is powered by Google Gemini.

## Commands

```bash
# Install dependencies
make install          # backend (uv sync) + frontend (npm install)

# Dev servers (runs both in parallel)
make dev              # backend :8000 + frontend :5173

# Test & Lint (backend only)
make test             # cd backend && uv run pytest
make lint             # cd backend && uv run ruff check .

# Single test
cd backend && uv run pytest test_main.py::test_health -v

# Docker
make up / make down / make logs

# Telegram bot
make bot
```

Backend API docs available at `http://localhost:8000/docs` when running.

## Architecture

```
Browser (React + Vite)
  │ Google Sign-In (GSI) → stores JWT in localStorage
  │ Authorization: Bearer <google_id_token>  OR  X-API-Key
  ▼
FastAPI backend
  ├── auth.py        dual-mode auth: Google OAuth or X-API-Key (for bot/scripts)
  ├── ai_service.py  Gemini API — extract_recipe()
  ├── github_store.py  all persistence: recipes/{id}.json, index.json
  └── search_service.py  keyword search on title, description, categories
```

**Storage**: No database. Everything lives in a separate GitHub repo (configured via `GITHUB_REPO`). The `GitHubStore` class in `github_store.py` manages:
- `recipes/{id}.json` — individual recipe files (UUID-named)
- `index.json` — list of `RecipeSummary` objects (maintained in sync on every write)

**Models**: `Recipe` (full) and `RecipeSummary` (index entry) in `models.py`. The `Recipe.model_post_init` auto-generates a `slug` from the title using `slugify()`. IDs are UUIDs.

**AI flow**: URL/text → `trafilatura` + BeautifulSoup extraction → `extract_recipe()` (Gemini JSON) → save recipe. Model: `gemini-2.5-flash` for extraction.

## Key Conventions

**README.md is the source of truth.** Update it when adding env vars, Makefile targets, API endpoints, or architecture changes.

**Auth**: Two accepted methods on protected endpoints (`require_auth` dependency):
1. `X-API-Key: <API_KEY>` — for bot and scripts
2. `Authorization: Bearer <google_id_token>` — for web login

Public endpoints: `GET /recipes`, `GET /recipes/{id}`, `GET /search`, `GET /categories`, `GET /health`.

**Testing pattern**: Tests mock `store.*` methods with `@patch("main.store.<method>", new_callable=AsyncMock)`. The `conftest.py` sets fake env vars so settings don't crash on import. Always add/update tests in `test_main.py` when changing routes or services.

**Frontend API calls**: All go through `api.js` → `request()` which auto-attaches the Bearer token from `auth.js`. The base URL is `VITE_API_URL` (production) or `/api` (proxied via Vite in dev, see `vite.config.js`).

**Frontend auth**: Google JWT is stored in `localStorage` under key `google_auth`. `isAuthorized()` checks the email against `VITE_ALLOWED_EMAILS`. Write actions (add/edit/delete) are gated by `isAuthorized()`.

**Package managers**: `uv` for Python (use `uv run` to execute), `npm` for Node. Do not use `pip` or `yarn`.

**Ruff config**: line-length 120, rules E/F/I (errors, pyflakes, isort). `import_legacy.py` and `ai_service.py` have E501 ignored.

**Environment**: Copy `env.example` → `.env`. Required vars: `GITHUB_TOKEN`, `GITHUB_REPO`, `GEMINI_API_KEY`, `API_KEY`, `GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS`. Optional: `ALLOWED_ORIGINS` (extra CORS origins). Frontend reads `VITE_GOOGLE_CLIENT_ID` and `VITE_API_URL` at build time.
