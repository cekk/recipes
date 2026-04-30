# 🍽️ Ricette

App web personale per raccogliere, organizzare e cercare ricette.

## Funzionalità

- **Salva ricette da URL** — incolla il link di una ricetta, l'AI (Google Gemini) estrae automaticamente titolo, ingredienti, procedimento, tempi e categorie
- **Salva da testo libero** — copia e incolla testo qualsiasi, l'AI lo struttura
- **Inserimento manuale** — form completo per ricette proprie
- **Ricerca per parola chiave** — cerca per titolo, descrizione o categoria
- **Filtro per categoria** — etichette assegnate automaticamente dall'AI
- **Immagini e Video** — immagini estratte dalla pagina originale, galleria nella pagina dettaglio
- **Bot Telegram** — condividi un URL o testo al bot, la ricetta viene salvata senza aprire il browser
- **Storage su GitHub** — ogni ricetta è un file JSON versionato; backup e history gratuiti

## Tech Stack

- **Backend**: Python 3.12 / FastAPI
- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4
- **AI**: Google Gemini API (`gemini-2.5-flash`) — Estrazione ricette 100% in cloud tramite account gratuito
- **Auth**: Google OAuth (Identity Services) — login con Gmail, nessuna password
- **Storage**: GitHub API (file JSON versionati)
- **Deploy**: Render.com (free tier) — backend Docker + frontend statico

## Architettura

```text
Browser
  │ Google Sign-In (GSI)
  │ Bearer token → /api/*
  ▼
Render Static Site (frontend React)
  │ VITE_API_URL → backend diretto
  ▼
Render Web Service (backend FastAPI)
  │ verifica Google token / API key
  ├──► Google Gemini API  (estrazione ricette)
  └──► GitHub API         (storage ricette JSON)
```

## Prerequisiti

- [uv](https://docs.astral.sh/uv/getting-started/installation/) (backend)
- [Node.js 22+](https://nodejs.org/) via nvm (frontend) — il progetto include `.nvmrc`
- API Key gratuita per **Google Gemini** su [Google AI Studio](https://aistudio.google.com/app/apikey)
- Un repo GitHub dedicato per le ricette (può essere privato)
- Un [GitHub PAT](https://github.com/settings/tokens) con scope `Contents: Read & Write`

## Setup iniziale

### 1. Clona e configura le variabili d'ambiente

```bash
git clone <questo-repo>
cd ricette
cp env.example .env
```

### 2. Crea le credenziali Google OAuth

1. Vai su [Google Cloud Console → Credenziali](https://console.cloud.google.com/apis/credentials)
2. Crea un progetto (o usa uno esistente)
3. **Crea credenziali → ID client OAuth 2.0 → Applicazione web**
4. Origini JavaScript autorizzate:
   - `http://localhost:5173` (sviluppo locale)
   - `https://ricette-frontend.onrender.com` (produzione — aggiungi dopo il deploy)
5. Copia il **Client ID** (formato: `xxxxxxxxxx.apps.googleusercontent.com`)

### 3. Variabili d'Ambiente

Configura le seguenti variabili nel file `.env`:

| Variabile | Descrizione | Obbligatoria |
|-----------|-------------|--------------|
| `GITHUB_TOKEN` | PAT GitHub con permesso `Contents: Read & Write` | Sì |
| `GITHUB_REPO` | Repository dove salvare i JSON (es. `utente/ricette-data`) | Sì |
| `GEMINI_API_KEY` | Chiave API Google Gemini | Sì |
| `API_KEY` | Chiave segreta per bot Telegram e script | Sì |
| `GOOGLE_CLIENT_ID` | Client ID OAuth da Google Cloud Console | Sì (per il login web) |
| `ALLOWED_EMAILS` | Email autorizzate a scrivere, separate da virgola | Sì (es. `tuo@gmail.com`) |
| `ALLOWED_ORIGINS` | Origini CORS aggiuntive, separate da virgola | No |
| `TELEGRAM_BOT_TOKEN` | Token del bot Telegram (da @BotFather) | No |
| `TELEGRAM_ALLOWED_USER_ID` | Il tuo Telegram User ID (da @userinfobot) | No |
| `BACKEND_URL` | URL pubblico del backend (per webhook Telegram) | No (sì se usi il bot) |

Per il **frontend** (in `.env` nella root o variabili Render):

| Variabile | Descrizione |
|-----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Stesso Client ID OAuth (letto da Vite al build) |
| `VITE_API_URL` | URL del backend (solo in produzione, es. `https://ricette-backend.onrender.com`) |

### 4. Installa le dipendenze e avvia in locale

```bash
# Usa nvm per attivare Node 22
nvm use

make install   # backend (uv) + frontend (npm)
make dev       # avvia backend e frontend in parallelo
```

- Backend: `http://localhost:8000` (docs su `/docs`)
- Frontend: `http://localhost:5173`

Il login Google funziona in locale se `http://localhost:5173` è tra le origini autorizzate nel tuo Client ID.

## Deploy su Render

Il file `render.yaml` configura tutto automaticamente.

### Prima volta

1. Crea un account su [render.com](https://render.com) (gratis, nessuna carta)
2. **New → Blueprint** e collega questo repository
3. Render legge `render.yaml` e crea i due servizi
4. Nella dashboard, imposta le **variabili d'ambiente** segnate come `sync: false`:
   - Nel backend: `GITHUB_TOKEN`, `GITHUB_REPO`, `GEMINI_API_KEY`, `API_KEY`, `GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS`
   - Nel frontend: `VITE_GOOGLE_CLIENT_ID`
5. **Importante**: dopo il primo deploy, copia l'URL del backend (es. `https://ricette-backend.onrender.com`) e:
   - Aggiornalo in `render.yaml` → `VITE_API_URL`
   - Aggiungilo alle origini autorizzate nel Client ID Google
   - Aggiungi anche l'URL del frontend alle origini Google

### Deploy successivi

Ogni push su `main` triggera il redeploy automatico di entrambi i servizi.

> **Nota free tier**: il backend va in sleep dopo 15 min di inattività. La prima richiesta dopo il sleep impiega ~30s. Per un'app personale è accettabile.

## Docker (self-hosted)

```bash
make up       # avvia con Docker Compose
make down     # ferma
make logs     # segui i log
```

Per la produzione su Raspberry Pi:
```bash
make pi-up
```

## Bot Telegram (opzionale)

Il bot usa `X-API-Key` per autenticarsi (non richiede Google OAuth).

1. Crea un bot con @BotFather → ottieni `TELEGRAM_BOT_TOKEN`
2. Ottieni il tuo user ID con @userinfobot → `TELEGRAM_ALLOWED_USER_ID`
3. Configura `BACKEND_URL` con l'URL pubblico del backend (es. `https://ricette-backend-cekk.onrender.com`)

**In produzione (Render)**: il bot si attiva automaticamente con webhook — nessun processo separato. All'avvio del backend, si registra su Telegram e riceve gli update a `POST /telegram/webhook`.

**In locale**: puoi usare `make bot` per testare in modalità polling (non serve `BACKEND_URL`).

4. Manda al bot un URL di una ricetta o del testo libero

## Script e Utilità

```bash
make help            # elenco completo comandi
make install         # installa dipendenze
make dev             # backend + frontend in sviluppo
make lint            # ruff check sul backend
make test            # pytest backend
make bot             # avvia bot Telegram
```

## Importazione ricette storiche

Se hai ricette in formato YAML (es. da un vecchio progetto):

```bash
cd backend && uv run python import_legacy.py
```

Lo script recupera i file YAML da `recipes-old` su GitHub, li passa a Gemini per la ristrutturazione, e salva tutto nel nuovo formato JSON.

## API

Endpoint protetti da autenticazione (Bearer token Google o `X-API-Key`):

```bash
# Estrai e salva da URL
curl -X POST https://ricette-backend.onrender.com/recipes/from-url \
  -H "X-API-Key: la-tua-chiave" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.giallozafferano.it/..."}'

# Ricerca (pubblica)
curl "https://ricette-backend.onrender.com/search?q=pasta+veloce"
```

Documentazione interattiva: `https://ricette-backend.onrender.com/docs`

## Risoluzione Problemi

### Login Google non funziona in locale
Assicurati che `http://localhost:5173` sia nelle **origini JavaScript autorizzate** del tuo Client ID su Google Cloud Console.

### Errore 401 dopo login
Il token Google scade dopo ~1 ora. Esci e rifai il login. Il frontend controlla l'expiry automaticamente.

### GitHub token scaduto
I PAT Classic scadono dopo 30/90 giorni. Rinnovalo su GitHub → Settings → Developer settings.
