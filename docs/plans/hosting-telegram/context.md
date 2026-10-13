# Feature: Hosting affidabile + bot Telegram funzionante

> Rendere il sito reattivo e il bot Telegram affidabile, decidendo se restare su Render free o cambiare metodo di pubblicazione.

## Overview
L'app (React su Render Static Site + FastAPI su Render Web Service free, storage su GitHub, AI con Gemini)
dà l'impressione che "il sito non vada" e soprattutto che l'integrazione Telegram non funzioni.
Prima di sistemare qualcosa va deciso se l'impostazione di deploy attuale ha ancora senso o se conviene
un altro metodo di pubblicazione.

## Diagnosi (verificata il 2026-10-13)
- **Frontend** (`ricette-cekk.onrender.com`): risponde in ~0.4s, nessun problema.
- **Backend** (`ricette-backend-cekk.onrender.com`): da dormiente `/health` ha impiegato **61s** a rispondere
  (free tier Render: spin-down dopo 15 min senza traffico). Da sveglio funziona: `/recipes` restituisce 12 ricette.
  Il sito "non va" perché il primo caricamento resta appeso un minuto.
- **Keep-alive**: c'è già un monitor UptimeRobot che risulta sempre "up", eppure il backend è stato trovato
  dormiente. Da verificare quale URL monitora (il frontend statico non dorme mai, quindi è sempre "up").
  Nota: `HEAD /health` risponde **405** (la route accetta solo GET), `HEAD /` risponde 404.
  **Causa confermata:** il monitor puntava a `https://ricette-cekk.onrender.com/health`, cioè al **frontend**.
  La regola SPA di `render.yaml` (`/*` → `/index.html`) restituisce 200 + `index.html` per qualsiasi path, quindi
  il monitor era sempre "up" senza mai toccare il backend. URL corretto:
  `https://ricette-backend-cekk.onrender.com/health`. Dopo la correzione il monitor è rosso: UptimeRobot usa `HEAD`
  e il backend risponde 405.
- **CORS**: ok, il backend accetta l'origine del frontend (`ALLOWED_ORIGINS` impostato da dashboard).
- **Webhook Telegram** (`getWebhookInfo`): registrato su `/telegram/webhook`, 0 update pendenti, nessun errore
  recente registrato da Telegram.
- **Problemi strutturali del bot nel codice:**
  1. Il bot vive dentro il processo del backend, quindi dorme insieme a lui: ogni messaggio dopo 15 minuti di
     inattività aspetta il cold start di ~60s.
  2. `POST /telegram/webhook` (`backend/main.py:256`) fa `await process_update(...)` e risponde solo **dopo**
     aver finito tutto il lavoro (download della pagina + Gemini + scrittura su GitHub). Cold start + elaborazione
     possono superare l'attesa di Telegram, che allora ripete lo stesso update → doppia elaborazione o un
     falso "⚠️ già presente".
  3. `trafilatura.fetch_url` è sincrono dentro un handler `async` (`backend/main.py:153`) → blocca l'event loop
     durante il download.
  4. Il bot richiama il proprio backend via HTTP su `http://localhost:8000` (`backend/bot.py:13`), un passaggio
     in più invece di chiamare direttamente il codice.
- **Sicurezza:**
  - `render.yaml` imposta `TELEGRAM_ALLOWED_USER_ID: "0"`, che in `_is_allowed` significa "tutti ammessi":
    chiunque trovi il bot può salvare ricette (consumando la quota Gemini e scrivendo nel repo GitHub).
  - **Confermato dall'utente (2026-10-13):** in produzione su Render vale davvero `0`.
  - Il webhook non verifica il `secret_token` di Telegram: chiunque può fare POST di update falsi.

## Goals
- Il sito risponde in tempi ragionevoli anche dopo un periodo di inattività.
- Mandare un URL o del testo al bot salva la ricetta in modo affidabile, senza duplicati né errori fantasma.
- Solo l'utente autorizzato può usare il bot.

## Decisione (2026-10-13)
Si resta su **Render free** (opzione 1). Il keep-alive c'è già: basta che UptimeRobot punti al backend
(`https://ricette-backend-cekk.onrender.com/health`). Il lavoro da fare riguarda il bot, la sicurezza del
webhook e piccole correzioni (HEAD su `/health`, README con URL vecchi).

## Out of scope
- Cambiare piattaforma di hosting (Raspberry Pi, Cloud Run): valutate e scartate per ora.
- Riscrivere il frontend o cambiare lo storage su GitHub, che oggi non danno problemi.
- Far chiamare al bot il codice del backend direttamente invece che via HTTP su `localhost:8000`.

## Key flows / behavior
Opzioni di pubblicazione da valutare (la scelta è ancora aperta):

1. **Restare su Render free, ma sistemato**: il webhook risponde subito 200 ed elabora in background (con
   deduplica per `update_id`), `secret_token` sul webhook, `TELEGRAM_ALLOWED_USER_ID` reale, più un ping
   esterno ogni ~10 min (GitHub Actions cron o UptimeRobot) per tenere sveglio il backend (un solo servizio
   always-on rientra nelle 750 ore/mese gratuite). Cambiamento minimo, costo zero.
2. **Raspberry Pi self-hosted** (target `pi-up` già presente nel Makefile): backend + frontend in Docker, bot
   in **polling** (non serve un URL pubblico per Telegram, niente cold start), sito esposto con Cloudflare
   Tunnel o Tailscale Funnel. Molto robusto, ma dipende dalla macchina di casa.
3. **Google Cloud Run** per il backend (frontend su Render static, GitHub Pages o Cloudflare Pages): scala a
   zero ma con cold start di pochi secondi invece di ~60s, free tier ampio, e l'app usa già Google (Gemini, OAuth).
   Il webhook Telegram funziona senza ping. Va gestito che dopo la risposta la CPU viene limitata (quindi
   elaborazione dentro la richiesta, entro i tempi di Telegram).

Quale che sia l'opzione, le correzioni di sicurezza e il "rispondi subito al webhook" restano utili.

## Screenshots
_None yet — drop images into `assets/` and ask to have them referenced here._

## Open questions
