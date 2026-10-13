# Piano: import ricette da Instagram

Contesto, test e decisioni: [`../context.md`](../context.md).

## Prerequisito
Questo piano parte dal codice del piano `docs/plans/hosting-telegram/` (commit `d78d8b2` e `4dc92bd`, già in
`main`): webhook con `secret_token`, update in `update_queue`, `_is_allowed` fail-closed, `asyncio.to_thread` per
`trafilatura.fetch_url`, backend formattato con `ruff format`.

## Ordine di implementazione
1. [`00-instagram-link.md`](00-instagram-link.md) — link Instagram → didascalia → ricetta, con copertina
   salvata nel repo dei dati e controllo duplicati sugli URL normalizzati.
2. [`01-screenshot-import.md`](01-screenshot-import.md) — ripiego: foto/album al bot → Gemini legge le
   immagini → ricetta. Dipende da 00 solo per il messaggio d'errore del bot che suggerisce lo screenshot
   (vedi 01, sezione bot).

Gli step vanno eseguiti in sequenza, non in parallelo: entrambi toccano `backend/main.py`, `backend/bot.py`
e `backend/test_main.py`.

## Convenzioni comuni
- Backend Python con `uv` (`uv run …`), mai `pip`. Ruff: line-length 120, regole E/F/I; la CI esegue anche
  `ruff format --check .`, quindi formattare i file toccati con `uv run ruff format <file>`.
- Nuova logica non banale in moduli dedicati nel backend (come `ai_service.py`, `search_service.py`), non
  tutta dentro `main.py`.
- Errori verso il client con `HTTPException` e messaggi `detail` in italiano, come nel resto di `main.py`.
- Il bot chiama il backend via HTTP su `API_BASE` con `_auth_headers()` (`backend/bot.py`) e mostra all'utente
  il `detail` degli errori; non far chiamare al bot il codice del backend direttamente.
- Test in `backend/test_main.py`, stile esistente: `TestClient(app)` senza context manager,
  `@patch("main.<nome>", new_callable=AsyncMock)` per le funzioni async importate in `main`. Niente chiamate
  di rete reali nei test (né Instagram né GitHub né Gemini né Telegram).
- README.md (in inglese) aggiornato quando si aggiungono endpoint o comportamenti visibili (vedi `AGENTS.md`).

## Verifica finale (dopo entrambi gli step e il deploy)
- `make lint`, `cd backend && uv run ruff format --check .`, `make test` passano.
- Condividere da Instagram al bot il reel `https://www.instagram.com/reel/DeT0hAqBIp6/?obrf=aHM1Z3JzOGR6cWht`
  → "✅ Schiacciata di zucca … salvata!" con ingredienti dalla didascalia; nel sito la ricetta mostra la
  copertina del reel e il link "Guarda Video" al reel.
- Ricondividere lo stesso reel (anche con un `?igsh=…` diverso) → "⚠️ Questa ricetta è già presente".
- Se da Render Instagram non restituisce la didascalia → il bot risponde suggerendo screenshot o testo, nessuna
  ricetta salvata.
- Mandare al bot 2 screenshot come album → un solo "⏳" e una sola ricetta salvata.
