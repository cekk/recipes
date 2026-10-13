# Piano: bot Telegram affidabile e sicuro su Render

Contesto completo e diagnosi: [`../context.md`](../context.md). Si resta su Render free; il keep-alive
UptimeRobot è già sistemato dall'utente (ora punta a `https://ricette-backend-cekk.onrender.com/health`).

## Obiettivo
1. Il webhook Telegram risponde **subito** 200 e l'elaborazione (download pagina + Gemini + GitHub) avviene in
   background, così Telegram non ripete gli update.
2. Gli update ripetuti comunque da Telegram (stesso `update_id`) vengono elaborati una volta sola.
3. Il webhook accetta solo richieste che arrivano davvero da Telegram (`secret_token`).
4. Il bot è usabile solo dall'utente configurato (niente più "0 = tutti").
5. Il download della pagina non blocca l'event loop.
6. `/health` accetta anche `HEAD` (alcuni monitor usano `HEAD`).
7. README allineato (URL vecchi, keep-alive, nuove regole del bot).

## File da modificare
- `backend/bot.py`
- `backend/main.py`
- `backend/test_main.py`
- `render.yaml`
- `README.md` (in inglese, è la fonte di verità: vedi `AGENTS.md`)
- `env.example` (solo commenti)

Non toccare il frontend, `github_store.py`, `ai_service.py`.

## Dettagli di implementazione

### 1. Webhook che risponde subito — `backend/bot.py`
Pattern ufficiale di python-telegram-bot per webhook custom (esempio `customwebhookbot.py` della documentazione):
l'endpoint mette l'update in `application.update_queue` e ritorna; l'`Application` già avviata con
`await application.start()` (lo fa già `setup_webhook`) consuma la coda in background.

- In `process_update(payload)` (oggi `backend/bot.py:136`) sostituire
  `await _application.process_update(update)` con `await _application.update_queue.put(update)`.
- Il webhook non usa l'`Updater` di PTB: in `setup_webhook` costruire l'application con `.updater(None)`.
  `_build_application()` è usato anche da `run_bot()` (polling, `make bot`), che **ha bisogno** dell'updater:
  quindi aggiungere un parametro, ad es. `_build_application(webhook: bool = False)`, e passare
  `.updater(None)` al builder solo quando `webhook=True`.
- Gli errori dentro gli handler non devono più arrivare alla risposta HTTP: `handle_message` ha già il suo
  `try/except`; aggiungere un error handler minimale con `application.add_error_handler(...)` che logga
  l'eccezione (usare `logging`, non `print`), così un errore in `cmd_list`/`cmd_search` non si perde.

### 2. Deduplica degli `update_id` — `backend/bot.py`
Dopo un cold start Telegram può aver già rimandato lo stesso update. In `process_update`:
- tenere in memoria gli ultimi `update_id` visti (es. `collections.deque(maxlen=200)` + `set`, o un
  `OrderedDict` limitato);
- se `payload["update_id"]` è già stato visto, ignorare l'update e ritornare senza metterlo in coda.
- È sufficiente lo stato in memoria del processo (una sola istanza su Render free).

### 3. `secret_token` sul webhook — `backend/bot.py` + `backend/main.py`
Nessuna nuova variabile d'ambiente: il segreto si ricava da `API_KEY`, che esiste già.
- In `bot.py` aggiungere `webhook_secret() -> str` che restituisce
  `hashlib.sha256(f"telegram-webhook:{get_settings().api_key}".encode()).hexdigest()`
  (64 caratteri esadecimali: rispetta il vincolo di Telegram `A-Z a-z 0-9 _ -`, 1–256 caratteri).
- In `setup_webhook`: `await _application.bot.set_webhook(url=webhook_url, secret_token=webhook_secret())`.
  Il webhook viene ri-registrato a ogni avvio (lifespan in `backend/main.py:22`), quindi il nuovo segreto
  entra in vigore al primo deploy senza passi manuali.
- In `backend/main.py`, endpoint `POST /telegram/webhook` (oggi `main.py:256`): leggere l'header
  `X-Telegram-Bot-Api-Secret-Token` e confrontarlo con `webhook_secret()` usando `secrets.compare_digest`
  (stesso stile di `require_auth` in `backend/auth.py`). Se manca o non corrisponde → `HTTPException(403)`,
  **prima** di leggere il body. Altrimenti `await process_update(payload)` e `return {"ok": True}`.

### 4. Utente autorizzato obbligatorio — `backend/bot.py` + `render.yaml`
- `_is_allowed` (oggi `backend/bot.py:22`): con `telegram_allowed_user_id == 0` deve restituire **False**
  (fail-closed), non True. Il messaggio di rifiuto in `handle_message` resta "Non sei autorizzato."; se l'ID
  configurato è 0, aggiungere un log di warning che spiega di impostare `TELEGRAM_ALLOWED_USER_ID`.
- Applicare `_is_allowed` anche a `cmd_list` e `cmd_search` (stessa risposta di rifiuto), così nessun comando
  del bot è aperto a sconosciuti. `/start` può restare aperto.
- `render.yaml`: per `TELEGRAM_ALLOWED_USER_ID` sostituire `value: "0"` con `sync: false`, come le altre
  variabili segrete. Il valore reale va impostato a mano nella dashboard Render (vedi "Passi manuali").
- `env.example`: nel commento di `TELEGRAM_ALLOWED_USER_ID` specificare che è obbligatorio perché il bot
  risponda a qualcuno.

### 5. Download non bloccante — `backend/main.py`
In `add_recipe_from_url` (oggi `main.py:153`) sostituire `trafilatura.fetch_url(data.url)` con
`await asyncio.to_thread(trafilatura.fetch_url, data.url)`. Il resto della funzione invariato.

### 6. `HEAD` su `/health` — `backend/main.py`
Sostituire `@app.get("/health")` con `@app.api_route("/health", methods=["GET", "HEAD"])`.
Oggi `HEAD /health` risponde 405.

### 7. README — `README.md` (in inglese)
- Sostituire gli URL vecchi con quelli reali: `ricette-backend.onrender.com` → `ricette-backend-cekk.onrender.com`
  (righe ~92, 195, 201, 204) e `ricette-frontend.onrender.com` → `ricette-cekk.onrender.com` (riga ~67).
- Sezione "Deploy to Render": sostituire la nota sul free tier con una sottosezione **Keep-alive** che spiega:
  monitor UptimeRobot (o simile) ogni 5 minuti su `https://ricette-backend-cekk.onrender.com/health`, meglio di
  tipo Keyword che cerca `ok`; **non** usare l'URL del frontend, perché la regola SPA di `render.yaml`
  restituisce 200 con `index.html` per qualsiasi path e il monitor risulterebbe sempre verde senza toccare il backend.
- Sezione "Telegram Bot": `TELEGRAM_ALLOWED_USER_ID` è obbligatorio (0 o vuoto = il bot rifiuta tutti); il
  webhook è protetto da un `secret_token` ricavato da `API_KEY` (se `API_KEY` cambia, il webhook si
  ri-registra al riavvio); il webhook risponde subito ed elabora in background.
- Tabella variabili: aggiornare la riga `TELEGRAM_ALLOWED_USER_ID` (obbligatoria se si usa il bot).

### 8. Test — `backend/test_main.py`
Seguire lo stile esistente (`client = TestClient(app)` senza context manager, quindi il lifespan non parte e
il webhook non viene registrato; mock con `patch(..., new_callable=AsyncMock)`). Aggiungere:
- `test_health_head`: `client.head("/health")` → 200.
- `test_telegram_webhook_missing_secret`: POST `/telegram/webhook` senza header → 403, `process_update` non chiamato
  (patch `main.process_update`).
- `test_telegram_webhook_wrong_secret`: header sbagliato → 403.
- `test_telegram_webhook_valid_secret`: header = `bot.webhook_secret()` → 200, `main.process_update` chiamato una volta.
- Test di deduplica su `bot.process_update`: impostare `bot._application` a un mock con
  `update_queue.put` `AsyncMock`, patchare `bot.Update.de_json`, chiamare due volte con lo stesso `update_id`
  → `put` chiamato una volta; con un `update_id` diverso → due volte. Ripristinare `bot._application` a `None`
  alla fine (anche se il test fallisce: usare `try/finally` o una fixture).
- Test di `_is_allowed`: con `telegram_allowed_user_id == 0` → False; con ID corrispondente → True; con ID diverso
  → False. Per cambiare l'ID patchare `bot.get_settings` con un oggetto che ha il campo desiderato
  (`get_settings` è in `lru_cache`, non modificare le env var a runtime).

Test asincroni: `pytest-asyncio` è già tra le dipendenze dev; se serve, marcare i test con
`@pytest.mark.asyncio` oppure usare `asyncio.run(...)` dentro test sincroni, scegliendo quello che funziona con
la configurazione attuale senza aggiungere configurazione nuova.

## Passi manuali (per l'utente, non per l'agente)
1. Nella dashboard Render del backend, impostare `TELEGRAM_ALLOWED_USER_ID` al proprio ID Telegram
   (da @userinfobot). Dopo il passaggio a `sync: false` verificare che il valore non sia rimasto `0`.
2. Verificare che il monitor UptimeRobot punti a `https://ricette-backend-cekk.onrender.com/health`.

## Criteri di accettazione
- `make lint` e `make test` passano; anche `cd backend && uv run ruff format --check .` (lo esegue la CI).
- `curl -I https://…/health` in locale (`make dev-backend`) → 200.
- In locale: POST su `/telegram/webhook` senza header `X-Telegram-Bot-Api-Secret-Token` → 403.
- `make bot` (polling) continua a funzionare: `_build_application()` senza argomenti costruisce ancora l'updater.
- Dopo il deploy:
  - `getWebhookInfo` di Telegram mostra l'URL `/telegram/webhook`, nessun `last_error_message`.
  - Inviando un URL di ricetta al bot dal proprio account arriva "⏳ Elaborazione in corso..." e poi **un solo**
    "✅ … salvata!", senza duplicati.
  - Da un altro account Telegram il bot risponde "Non sei autorizzato." anche a `/list` e `/search`.
  - `curl -X POST https://ricette-backend-cekk.onrender.com/telegram/webhook -d '{}'` → 403.
- `README.md` non contiene più `ricette-backend.onrender.com` né `ricette-frontend.onrender.com`.

## Note e domande aperte
- Con `concurrent_updates` disattivato (default di PTB) gli update vengono elaborati uno alla volta: due
  ricette inviate di fila vengono salvate in sequenza. Va bene per uso personale; non cambiarlo.
- Il bot continua a chiamare il backend via HTTP su `http://localhost:8000` (`backend/bot.py:13`): fuori scopo.
