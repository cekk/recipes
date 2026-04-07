# 🍽️ Ricette

App web personale per raccogliere, organizzare e cercare ricette.

## Funzionalità

- **Salva ricette da URL** — incolla il link di una ricetta, l'AI (Google Gemini) estrae automaticamente titolo, ingredienti, procedimento, tempi e categorie
- **Salva da testo libero** — copia e incolla testo qualsiasi, l'AI lo struttura
- **Inserimento manuale** — form completo per ricette proprie
- **Ricerca semantica** — cerca per concetto ("cosa faccio con le zucchine") oltre che per parola chiave, usando embeddings cloud base (`gemini-embedding-001`)
- **Filtro per categoria** — etichette assegnate automaticamente dall'AI
- **Bot Telegram** — condividi un URL o testo al bot, la ricetta viene salvata senza aprire il browser
- **Storage su GitHub** — ogni ricetta è un file JSON versionato; backup e history gratuiti

## Tech Stack

- **Backend**: Python 3 / FastAPI
- **Frontend**: React + Vite + Tailwind CSS
- **AI**: Google Gemini API (`gemini-2.5-flash` + `gemini-embedding-001`) — Estrazione ed embeddings 100% in cloud tramite account gratuito
- **Storage**: GitHub API (file JSON versionati)
- **Containerizzazione**: Docker + Docker Compose

## Architettura

```text
┌─────────────────────────────────────────────────────┐
│  Cloudflare Tunnel (accesso esterno gratuito)        │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  nginx (porta 80)│  ← frontend React + reverse proxy
              └────┬───────┬────┘
                   │ /api/ │ /
          ┌────────▼──┐  ┌─▼──────┐
          │  FastAPI  │  │ React  │
          │ (backend) │  │  SPA   │
          └─────┬─────┘  └────────┘
                │
        ┌───────┴────────┐
        │                │
   ┌─────────┐
   │ AI Cloud│    ┌──────▼──────┐
   │(Gemini) │    │  GitHub API │
   │         │    │  (storage)  │
   └────▲────┘    └─────────────┘
        │
        └─────────────────┘
```

## Prerequisiti

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (per sviluppo locale del backend)
- [Node.js 20+](https://nodejs.org/) (per sviluppo locale del frontend)
- API Key gratuita per **Google Gemini API** (creabile su [Google AI Studio](https://aistudio.google.com/app/apikey))
- Un repo GitHub dedicato per le ricette (può essere privato)
- Un [GitHub Personal Access Token (PAT)](https://github.com/settings/tokens) (Classic) o Fine-Grained Token con permessi di lettura/scrittura per i contenuti del repository (`Contents: Read & Write`).

## Setup iniziale

### 1. Clona e configura le variabili d'ambiente

```bash
git clone <questo-repo>
cd ricette
cp env.example .env
```

### 2. Variabili d'Ambiente

Configura le seguenti variabili nel file `.env`:

| Variabile | Descrizione | Esempio | Obbligatoria |
|-----------|-------------|---------|--------------|
| `GITHUB_TOKEN` | PAT GitHub con permesso di R/W sui contenuti | `ghp_xxxxxxxxxxxxxxxxxxxx` | Sì |
| `GITHUB_REPO` | Repository dove salvare i file JSON delle ricette | `tuousername/ricette_data` | Sì |
| `API_KEY` | Chiave di sicurezza per gli endpoint di scrittura API | `una-chiave-segreta-molto-lunga` | Sì |
| `GEMINI_API_KEY` | Chiave API per l'IA Google | `AIzaSyxxxxxxxxxx...` | Sì |
| `TELEGRAM_ALLOWED_USER_ID` | Il tuo ID utente Telegram per limitare l'accesso al bot | `12345678` | No |

### 3. Crea il repo GitHub per le ricette

Vai su GitHub e crea un nuovo repository dedicato solo ai dati (es. `ricette_data`). Può essere privato!
Non è necessario inizializzarlo con alcun file: il backend creerà i file JSON automaticamente quando salvi la prima ricetta.

Installa le dipendenze per frontend e backend:

```bash
make install
```

Avvia sia il backend che il frontend (usando i server di sviluppo):

```bash
make dev
```

Oppure in terminali separati:
- `make dev-backend` → API raggiungibili a `http://localhost:8000` (docs su `/docs`)
- `make dev-frontend` → App React raggiungibile a `http://localhost:5173`

*(Nota: Su Mac, usare Docker per Ollama può causare una forte perdita di performance, quindi l'approccio consigliato in sviluppo locale è usare Ollama nativo)*

## Deploy (Locale con Docker Compose)

Usa Docker Compose per avviare il frontend e backend integrati. Verrà esposta l'app alla porta 80 dal frontend, e l'API FastAPI esposta attraverso il reverse proxy su `/api`.

```bash
make up
```

L'interfaccia sarà disponibile all'indirizzo `http://localhost:80` (o la porta mappata nel compose) e i container dialogheranno con le API online.

## Deploy in Produzione (Raspberry Pi / Linux)

Avvia il tuo stack leggero direttamente senza pesanti modelli AI nel docker:
```bash
make pi-up
```

Per rendere la tua istanza accessibile dall'esterno in modo sicuro senza aprire le porte del router, puoi utilizzare Cloudflare Tunnels:

```bash
cloudflared tunnel --url http://localhost:80
```

## Strumenti e Script Disponibili (`Makefile`)

Il progetto include un `Makefile` con comandi pronti all'uso:

| Comando | Descrizione |
|---------|-------------|
| `make help` | Mostra l'elenco dei comandi disponibili |
| `make install` | Installa le dipendenze (backend con uv + frontend con npm) |
| `make dev` | Mette in ascolto server backend e frontend contemporaneamente |
| `make dev-backend` | Avvia **solo** il backend tramite FastAPI e uv |
| `make dev-frontend` | Avvia **solo** il frontend con Vite |
| `make up` | Esegue docker-compose per avviare il sistema in locale via Docker |
| `make down` / `make logs` | Ferma i container / Osserva i log di sistema |
| `make pi-up` / `make pi-down` | Esecuzione snella per ambiente di produzione/Raspberry |
| `make bot` | Avvia il bot Telegram separatamente in locale |
| `make rebuild-index` | Ricostruisce l'indice semantico interno delle ricette |
| `make lint` | Esegue i controlli sul codice del backend tramite Ruff |

## Bot Telegram (opzionale)

Se hai configurato `TELEGRAM_BOT_TOKEN` e `TELEGRAM_ALLOWED_USER_ID`:

1. Avvia il bot (puoi anche metterlo come servizio in background in produzione):
   ```bash
   make bot
   ```
2. Manda al bot un URL (es di GialloZafferano) o del testo grezzo.
3. Il bot salverà la ricetta direttamente su GitHub estraendo magicamente tutte le info.

## API

Per l'integrazione di script custom, questi webhook (protetti dalla `X-API-Key`) sono utilissimi:

```bash
# Estrai e salva da URL
curl -X POST http://localhost:8000/recipes/from-url \
  -H "X-API-Key: la-tua-chiave-API" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.giallozafferano.it/..."}'

# Estrai da testo destrutturato
curl -X POST http://localhost:8000/recipes/from-text \
  -H "X-API-Key: la-tua-chiave-API" \
  -H "Content-Type: application/json" \
  -d '{"text": "Carbonara: 200g pasta, pancetta a cubetti ecc..."}'

# Ricerca semantica avanzata
curl "http://localhost:8000/search?q=una+pasta+fresca+e+veloce&semantic=true"
```

*Nota: La documentazione interattiva completa prodotta da FastAPI è su `/docs` (Swagger UI).*

## Risoluzione dei Problemi Frequenti (Troubleshooting)

### Autenticazione o Permessi Github Negati
Assicurati che la chiave GitHub (`GITHUB_TOKEN`) non sia scaduta. Spesso i PAT classici scadono dopo 30/90 giorni. Assicurati che lo scope `Contents: Read & Write` sia abilitato.

### Errore Estrazione AI o Timeout
Controlla di non aver superato i limiti gratuiti di Gemini (Rate Limiting). Se non carica nulla, l'API Key potrebbe non essere compilata nel `.env` oppure essere in formato scorretto.

### Ricerca semantica non trova nulla
Se ti accorgi che aggiungendo dati da app non appare subito in base, ricordati che puoi forzare la ricostruzione dell'indice semantico dell'intera repository tramite:
```bash
make rebuild-index
```
