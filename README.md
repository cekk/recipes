# 🍽️ Ricette

Personal web app to collect, organize, and search for recipes.

## Features

- **Save recipes from URL** — paste a recipe link, and the AI (Google Gemini) automatically extracts the title, ingredients, instructions, prep times, and categories.
- **Save from free text** — copy and paste any text, and the AI structures it.
- **Manual entry** — complete form for your own recipes.
- **Keyword search** — search by title, description, or category.
- **Category filter** — labels automatically assigned by the AI.
- **Images and Videos** — images extracted from the original page, displayed in a gallery on the detail page.
- **Telegram Bot** — share a URL or text with the bot, and the recipe is saved without opening the browser.
- **GitHub Storage** — each recipe is a versioned JSON file; free backup and history.
- **Duplicate Prevention** — automatically checks URLs and titles to prevent the insertion of already existing recipes (both from the web and Telegram).

## Tech Stack

- **Backend**: Python 3.12 / FastAPI
- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4
- **AI**: Google Gemini API (`gemini-2.5-flash`) — 100% cloud recipe extraction via a free account.
- **Auth**: Google OAuth (Identity Services) — login with Gmail, no password required.
- **Storage**: GitHub API (versioned JSON files).
- **Deploy**: Render.com (free tier) — Docker backend + static frontend.

## Architecture

```text
Browser
  │ Google Sign-In (GSI)
  │ Bearer token → /api/*
  ▼
Render Static Site (frontend React)
  │ VITE_API_URL → direct backend
  ▼
Render Web Service (backend FastAPI)
  │ verify Google token / API key
  ├──► Google Gemini API  (recipe extraction)
  └──► GitHub API         (JSON recipe storage)
```

## Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) (backend)
- [Node.js 22+](https://nodejs.org/) via nvm (frontend) — the project includes an `.nvmrc` file
- Free API Key for **Google Gemini** from [Google AI Studio](https://aistudio.google.com/app/apikey)
- A dedicated GitHub repo for the recipes (can be private)
- A [GitHub PAT](https://github.com/settings/tokens) with `Contents: Read & Write` scope

## Initial Setup

### 1. Clone and configure environment variables

```bash
git clone <this-repo>
cd ricette
cp env.example .env
```

### 2. Create Google OAuth credentials

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a project (or use an existing one)
3. **Create credentials → OAuth client ID → Web application**
4. Authorized JavaScript origins:
   - `http://localhost:5173` (local development)
   - `https://ricette-frontend.onrender.com` (production — add after deploy)
5. Copy the **Client ID** (format: `xxxxxxxxxx.apps.googleusercontent.com`)

### 3. Environment Variables

Configure the following variables in your `.env` file:

| Variable | Description | Required |
|-----------|-------------|--------------|
| `GITHUB_TOKEN` | GitHub PAT with `Contents: Read & Write` permissions | Yes |
| `GITHUB_REPO` | Repository where JSON files will be saved (e.g. `user/recipes-data`) | Yes |
| `GEMINI_API_KEY` | Google Gemini API Key | Yes |
| `API_KEY` | Secret key for Telegram bot and scripts (generate a random string, e.g., `openssl rand -hex 16`) | Yes |
| `GOOGLE_CLIENT_ID` | OAuth Client ID from Google Cloud Console | Yes (for web login) |
| `ALLOWED_EMAILS` | Emails authorized to write, separated by commas | Yes (e.g. `you@gmail.com`) |
| `ALLOWED_ORIGINS` | Additional CORS origins, separated by commas | No |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (from @BotFather) | No |
| `TELEGRAM_ALLOWED_USER_ID` | Your Telegram User ID (from @userinfobot) | No |
| `BACKEND_URL` | Public backend URL (for Telegram webhooks) | No (yes if using the bot) |

For the **frontend** (in `.env` in the root or Render variables):

| Variable | Description |
|-----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Same OAuth Client ID (read by Vite during build) |
| `VITE_API_URL` | Backend URL (only in production, e.g. `https://ricette-backend.onrender.com`) |

### 4. Install dependencies and run locally

```bash
# Use nvm to activate Node 22
nvm use

make install   # backend (uv) + frontend (npm)
make dev       # start backend and frontend in parallel
```

- Backend: `http://localhost:8000` (docs at `/docs`)
- Frontend: `http://localhost:5173`

Google login works locally if `http://localhost:5173` is among the authorized origins in your Client ID.

## Deploy to Render

The `render.yaml` file configures everything automatically.

### First Time

1. Create an account on [render.com](https://render.com) (free, no credit card required)
2. **New → Blueprint** and connect this repository
3. Render reads `render.yaml` and creates both services
4. In the dashboard, set the **environment variables** marked as `sync: false`:
   - In the backend: `GITHUB_TOKEN`, `GITHUB_REPO`, `GEMINI_API_KEY`, `API_KEY`, `GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS`, `TELEGRAM_BOT_TOKEN`
   - In the frontend: `VITE_GOOGLE_CLIENT_ID`
5. **Important**: the `render.yaml` file already contains predefined values for `VITE_API_URL` (frontend) and `BACKEND_URL` (backend). If the name of your service changes, update them accordingly in your repository or override them from the Render dashboard.
6. Add the backend and frontend URLs to the authorized origins in your Google Client ID on Cloud Console.

### Subsequent Deploys

Every push to `main` triggers an automatic redeploy of both services.

> **Free tier note**: the backend goes to sleep after 15 mins of inactivity. The first request after sleeping takes ~30s. For a personal app, this is acceptable.

## Docker (self-hosted)

```bash
make up       # start with Docker Compose
make down     # stop
make logs     # follow logs
```

For production on Raspberry Pi:
```bash
make pi-up
```

## Telegram Bot (optional)

The bot uses `X-API-Key` to authenticate (does not require Google OAuth).

1. Create a bot with @BotFather → get `TELEGRAM_BOT_TOKEN`
2. Get your user ID with @userinfobot → `TELEGRAM_ALLOWED_USER_ID`
3. Configure `BACKEND_URL` with the public backend URL (e.g. `https://ricette-backend-cekk.onrender.com`)

**In production (Render)**: the bot activates automatically with webhooks — no separate process needed. When the backend starts, it registers with Telegram and receives updates at `POST /telegram/webhook`.

**Locally**: you can use `make bot` to test in polling mode (`BACKEND_URL` is not needed).

4. Send a recipe URL or free text to the bot.

## Scripts and Utilities

```bash
make help            # full list of commands
make install         # install dependencies
make dev             # backend + frontend in development
make lint            # ruff check on the backend
make test            # pytest backend
make bot             # start Telegram bot
```

## Testing

To run backend tests locally:

```bash
cd backend
uv run pytest
```

Tests use `pytest` and mock interactions with GitHub (`github_store.py`) so the real repository is not altered during testing, ensuring that suites are fast and isolated.

## Legacy Recipes Import

If you have recipes in YAML format (e.g. from an old project):

```bash
cd backend && uv run python import_legacy.py
```

The script fetches YAML files from `recipes-old` on GitHub, passes them to Gemini for restructuring, and saves everything in the new JSON format.

## API

Endpoints protected by authentication (Google Bearer token or `X-API-Key`):

```bash
# Extract and save from URL
curl -X POST https://ricette-backend.onrender.com/recipes/from-url \
  -H "X-API-Key: your-key-here" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.giallozafferano.it/..."}'

# Search (public)
curl "https://ricette-backend.onrender.com/search?q=quick+pasta"
```

Interactive documentation: `https://ricette-backend.onrender.com/docs`

## Troubleshooting

### Google Login does not work locally
Ensure `http://localhost:5173` is in the **Authorized JavaScript origins** of your Client ID on the Google Cloud Console.

### 401 Error after login
The Google token expires after ~1 hour. Log out and log back in. The frontend checks for expiry automatically.

### GitHub token expired
Classic PATs expire after 30/90 days. Renew it on GitHub → Settings → Developer settings.
