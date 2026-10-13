# Step 01 — Screenshot al bot → ricetta

Leggi prima [`README.md`](README.md). Questo step parte dopo [`00-instagram-link.md`](00-instagram-link.md).

## Obiettivo
L'utente manda al bot una foto o un album di foto (tipicamente screenshot di un post Instagram, ma qualsiasi
immagine con una ricetta), con o senza didascalia Telegram. Il bot raccoglie le foto, le manda al backend in
una sola richiesta, Gemini legge la ricetta dalle immagini e la ricetta viene salvata. Gli screenshot **non**
vengono salvati come immagini della ricetta.

## File
- `backend/ai_service.py`
- `backend/main.py`
- `backend/bot.py`
- `backend/test_main.py`
- `README.md`

## Dettagli

### 1. `backend/ai_service.py` — estrazione da immagini
- Spostare il prompt di `extract_recipe` in una funzione `_build_prompt(content: str) -> str` (stesso testo),
  così da riusarlo. `extract_recipe(content)` resta con la stessa firma e lo stesso comportamento.
- Nuova `async extract_recipe_from_images(images: list[tuple[bytes, str]], text: str | None = None) -> dict`:
  - `contents = [prompt, *[types.Part.from_bytes(data=b, mime_type=mt) for b, mt in images]]`, dove il prompt è
    `_build_prompt(...)` con al posto del testo un'istruzione tipo "La ricetta è nelle immagini allegate
    (screenshot); trascrivi fedelmente ingredienti e passaggi" più l'eventuale `text` dell'utente.
  - Stessa chiamata di `_chat` (`client.aio.models.generate_content`, `response_mime_type="application/json"`,
    `temperature=0.1`, modello `settings.gemini_model` = `gemini-2.5-flash`, che accetta immagini). Generalizzare
    `_chat` per accettare `contents` (stringa o lista) invece di duplicarlo.
  - `_parse_json` sulla risposta, come oggi.
  - API verificata nella documentazione di google-genai: `types.Part.from_bytes(data=..., mime_type=...)` in
    `contents` insieme a una stringa.

### 2. `backend/main.py` — `POST /recipes/from-images`
- Endpoint protetto (`dependencies=[Depends(require_auth)]`, come gli altri di scrittura), `response_model=Recipe`.
- Input multipart: `files: list[UploadFile]` (1–5 file) e `text: str | None = Form(None)`. `python-multipart` è
  già tra le dipendenze.
- Validazioni → 422 con detail in italiano: nessun file, più di 5 file, file non `image/*`, file > 10 MB.
- `extracted = await extract_recipe_from_images([...], data_text)`; `extracted["source_type"] = "screenshot"`;
  `image_urls = []` (scartare URL inventati); `recipe = Recipe(**extracted)`.
- Controllo duplicati per `slug` come in `add_recipe_from_text` → 409 `"Ricetta già presente (Titolo duplicato)"`.
- `await store.save_recipe(recipe)`; `return recipe`.

### 3. `backend/bot.py` — foto e album
- Nuovo handler registrato in `_build_application`: `MessageHandler(filters.PHOTO, handle_photo)`.
- `handle_photo`:
  - `_is_allowed` come gli altri handler (stessa risposta "Non sei autorizzato.").
  - Scaricare la foto più grande: `file = await update.message.photo[-1].get_file()`,
    `data = bytes(await file.download_as_bytearray())`, mime `image/jpeg` (Telegram ricodifica le foto in JPEG).
  - **Foto singola** (`update.message.media_group_id is None`): rispondere "⏳ Elaborazione in corso..." e
    processare subito.
  - **Album** (`media_group_id` presente): Telegram manda ogni foto come update separato con lo stesso
    `media_group_id`. Accumularle in un dizionario a livello di modulo `media_group_id -> {chat/message per
    rispondere, lista di bytes, caption}`; a ogni foto (ri)programmare con `asyncio.create_task` un flush
    ritardato di ~2,5 s (annullando il task precedente dello stesso gruppo). Al flush: un solo
    "⏳ Elaborazione in corso..." e una sola chiamata al backend. L'handler **non** deve attendere il ritardo
    (gli update sono elaborati in sequenza dalla coda di PTB: un `await asyncio.sleep` nell'handler
    bloccherebbe le foto successive dello stesso album).
  - La didascalia Telegram (`update.message.caption`, di solito sulla prima foto dell'album) va passata come
    `text`.
  - Chiamata al backend: `httpx.AsyncClient(timeout=180)`, `POST {API_BASE}/recipes/from-images` con
    `files=[("files", (f"{i}.jpg", data, "image/jpeg")), …]`, `data={"text": caption}` se presente,
    `headers=_auth_headers()`.
  - Gestione risposta ed errori identica a `handle_message` (✅ salvata / ⚠️ già presente / ❌ detail):
    estrarre in una funzione condivisa la parte che formatta la risposta ed errori, invece di duplicarla.
- Messaggio d'errore Instagram (step 00): il detail suggerisce già "Manda uno screenshot"; nessuna modifica.
- `/start`: aggiungere "• Uno o più screenshot di una ricetta".

### 4. Test — `backend/test_main.py`
- `POST /recipes/from-images` con 2 file immagine finti (bytes qualsiasi, content type `image/jpeg`) e `text`,
  autenticato: 200, `source_type == "screenshot"`, `extract_recipe_from_images` chiamato con 2 immagini e il testo
  (patch `main.extract_recipe_from_images`, `main.store.get_index`, `main.store.save_recipe`).
- Senza auth → 401. Nessun file → 422. 6 file → 422. File `text/plain` → 422. Slug duplicato → 409.
- Raggruppamento album nel bot: testare la logica di accumulo/flush in isolamento (es. funzione che riceve le
  foto già scaricate e un flush iniettabile), verificando che 3 foto con lo stesso `media_group_id` producano
  una sola chiamata con 3 immagini. Non serve simulare Telegram per intero.

### 5. README.md (in inglese)
- Features e sezione Telegram Bot: si possono mandare uno o più screenshot (anche come album), letti da Gemini.
- Sezione API: documentare `POST /recipes/from-images` (multipart, `files` 1–5 immagini ≤ 10 MB, `text`
  opzionale, autenticato) con un esempio `curl -F`.

## Criteri di accettazione
- `make lint`, `cd backend && uv run ruff format --check .`, `make test` passano.
- `extract_recipe` per testo/URL funziona come prima (test esistenti verdi).
- `make bot` (polling, in locale) con il proprio account: una foto singola → una ricetta; un album di 2–3
  screenshot → un solo "⏳" e una sola ricetta. **Scrive davvero nel repo dei dati**: farlo solo se l'utente è
  d'accordo e cancellare poi le ricette di prova.
