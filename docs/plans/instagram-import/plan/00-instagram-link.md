# Step 00 — Link Instagram → ricetta con copertina

Leggi prima [`README.md`](README.md) (prerequisito di branch e convenzioni).

## Obiettivo
Quando `POST /recipes/from-url` riceve un link Instagram (post o reel), il backend legge la didascalia dal
`<meta name="description">` della pagina scaricata con uno user-agent da crawler di anteprime, la passa a
Gemini, salva la copertina nel repo dei dati e salva la ricetta. Se la didascalia non si legge, errore chiaro
invece di una ricetta inventata. Vale sia per il bot sia per "Salva da URL" del sito, che usano lo stesso
endpoint.

## Cosa è stato verificato (2026-10-13, da rete domestica)
Reel `https://www.instagram.com/reel/DeT0hAqBIp6/`:
- con user-agent da browser la pagina **non** contiene la didascalia;
- con `User-Agent: facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)` (stesso
  risultato con Googlebot e TelegramBot) la pagina contiene:
  - `<meta name="description" content="10K likes, 151 comments - claudiamanciniph on October 10, 2026: &quot;È ARRIVATO … #ricettezucca&quot;. " />`
    (HTML-escaped, con a capo reali dentro l'attributo; la didascalia è completa, 874 caratteri);
  - `<meta property="og:image" content="https://scontent-….cdninstagram.com/…jpg?…" />` (URL firmato, scade);
  - `<meta property="og:url" content="https://www.instagram.com/claudiamanciniph/reel/DeT0hAqBIp6/" />`;
  - `<meta name="twitter:title" content="Claudia | Food Photography&amp;Video (&#064;claudiamanciniph) &#x2022; Instagram reel" />`.
- Non verificato da Render: Instagram potrebbe non restituire la didascalia agli IP dei datacenter. Il codice
  deve gestire quel caso come "didascalia non trovata".

## File
- **Nuovo** `backend/instagram_service.py`
- `backend/github_store.py`
- `backend/main.py`
- `backend/bot.py`
- `backend/test_main.py`
- `README.md`

## Dettagli

### 1. `backend/instagram_service.py` (nuovo)
- `is_instagram_url(url: str) -> bool`: host `instagram.com` o `www.instagram.com` (anche `m.instagram.com`).
- `normalize_instagram_url(url: str) -> str | None`: estrae tipo (`p`, `reel`, `reels`→`reel`, `tv`) e shortcode
  dal path, ignorando un eventuale segmento username (`/claudiamanciniph/reel/DeT0hAqBIp6/`) e la query
  string; restituisce `https://www.instagram.com/{tipo}/{shortcode}/`. `None` se l'URL non è un post/reel.
- `@dataclass InstagramPost`: `canonical_url: str`, `caption: str`, `author: str | None`, `image_url: str | None`,
  `is_video: bool` (tipo `reel`/`tv`).
- `async fetch_instagram_post(url: str) -> InstagramPost | None`:
  - `httpx.AsyncClient` con `User-Agent` `facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)`,
    `Accept-Language: en-US,en;q=0.8` (il prefisso "N likes, M comments - …" è stato verificato in inglese),
    `follow_redirects=True`, timeout ~20s; GET sull'URL normalizzato.
  - Parsing con `BeautifulSoup` (già dipendenza): `meta[name=description]`, `meta[property=og:image]`,
    `meta[name=twitter:title]` per l'autore se utile. BeautifulSoup decodifica già le entità HTML.
  - Estrarre la didascalia dal formato `<prefisso>: "<didascalia>".`: prendere il testo tra il primo `: "`
    e l'ultima `"`; se il formato non corrisponde, usare l'intera description.
  - Restituire `None` se la risposta non è 200, se manca `meta[name=description]`, o se la didascalia
    risultante è vuota/troppo corta per essere una ricetta (es. < 40 caratteri).
  - Nessuna eccezione verso il chiamante per errori di rete: log + `None`.
- `async download_image(url: str) -> tuple[bytes, str] | None`: scarica la copertina (stesso user-agent),
  restituisce `(bytes, content_type)`; `None` su errore o se non è `image/*` o se > 5 MB.

### 2. `backend/github_store.py` — immagini nel repo dei dati
- `_put_file` oggi accetta solo `str` e fa `content.encode()`: farlo accettare anche `bytes` (codifica in base64
  direttamente se già bytes), senza cambiare il comportamento per i chiamanti esistenti.
- `async save_image(recipe_id: str, data: bytes, ext: str) -> str`: scrive `images/{recipe_id}.{ext}` (messaggio
  di commit tipo `Aggiunge immagine ricetta {recipe_id}`) e restituisce
  `https://raw.githubusercontent.com/{self.repo}/{self.branch}/images/{recipe_id}.{ext}`.
  Il repo `cekk/recipes-data` è pubblico, quindi l'URL `raw` funziona nel frontend senza modifiche
  (`RecipeCard.jsx`, `RecipeDetailPage.jsx` usano `image_urls[0]` come `background-image`).
- `delete_recipe`: dopo aver cancellato la ricetta, cancellare anche `images/{recipe_id}.*` se esiste
  (per sapere l'estensione: provare `jpg`, `png`, `webp` con `_get_file`, oppure ricavarla dall'`image_urls`
  della ricetta letta prima della cancellazione — scegliere la soluzione più semplice). Un errore qui non deve far
  fallire la cancellazione della ricetta.

### 3. `backend/main.py` — ramo Instagram in `add_recipe_from_url`
All'inizio di `add_recipe_from_url`, dopo `_validate_url`:
- se `is_instagram_url(data.url)`:
  1. `canonical = normalize_instagram_url(data.url)`; se `None` → 422 `"Link Instagram non riconosciuto (serve
     un post o un reel)"`.
  2. Controllo duplicati: confrontare `canonical` con `normalize_instagram_url(summary.source_url)` per ogni
     ricetta Instagram dell'indice → 409 con lo stesso detail esistente (`"Ricetta già presente (URL duplicato)"`).
  3. `post = await fetch_instagram_post(canonical)`; se `None` → 422 con detail
     `"Non riesco a leggere la didascalia del post Instagram. Manda uno screenshot o incolla il testo della ricetta."`
  4. `extracted = await extract_recipe(post.caption)` (stessa funzione del testo libero; aggiungere in testa
     al contenuto una riga con l'autore se disponibile, es. `Autore: @…`).
  5. `recipe = Recipe(**extracted)` poi impostare: `source_url = canonical`, `source_type = "instagram"`,
     `video_urls = [canonical]` se `post.is_video` (così il dettaglio mostra "▶️ Guarda Video"), e
     `image_urls = []` (scartare eventuali URL inventati da Gemini).
  6. Copertina: se `post.image_url`, `download_image` → `store.save_image(recipe.id, …)` → `image_urls = [url]`.
     Se il download o l'upload falliscono: log e si prosegue senza immagine (la ricetta si salva comunque).
  7. `await store.save_recipe(recipe)` e `return recipe`.
- Il ramo non-Instagram resta invariato.
- `source_type = "instagram"` è un nuovo valore: verificare che il frontend non lo usi in modo vincolante
  (cercare `source_type` in `frontend/src`); se lo mostra come etichetta va bene così.

### 4. `backend/bot.py`
- In `handle_message`, prima del test `text.startswith("http")`: se il testo **contiene** un URL Instagram
  (la condivisione da Instagram può includere testo prima del link), usare quel link come URL.
- Errori: oggi per status diversi da 409 il bot risponde `❌ Errore API: {status} - {response.text}`. Per i
  422 mostrare solo il `detail` del JSON (es. `❌ Non riesco a leggere la didascalia…`), così il messaggio
  è leggibile; per gli altri status lasciare il comportamento attuale.
- Aggiornare il testo di `/start` aggiungendo "• Un post o reel di Instagram".

### 5. Test — `backend/test_main.py`
- `normalize_instagram_url`: `https://www.instagram.com/reel/DeT0hAqBIp6/?obrf=aHM1Z3JzOGR6cWht`,
  `https://www.instagram.com/claudiamanciniph/reel/DeT0hAqBIp6/`, `https://instagram.com/p/ABC123/?igsh=xyz`,
  `https://www.instagram.com/reels/DeT0hAqBIp6` → forme canoniche attese; profilo
  `https://www.instagram.com/claudiamanciniph/` → `None`.
- Parsing della didascalia: testare la funzione che estrae caption/immagine dall'HTML con una pagina sintetica
  minimale che riproduce i meta tag sopra (prefisso `10K likes, … : "…".`, entità `&quot;`, a capo). Strutturare
  `fetch_instagram_post` in modo che il parsing sia una funzione pura testabile senza rete.
- `POST /recipes/from-url` con link Instagram, autenticato con `X-API-Key: fake-api-key`:
  - didascalia trovata → 200, `source_url` canonico, `source_type == "instagram"`, `image_urls` con l'URL
    restituito da `save_image` (patch `main.fetch_instagram_post`, `main.download_image`, `main.extract_recipe`,
    `main.store.get_index`, `main.store.save_image`, `main.store.save_recipe`);
  - `fetch_instagram_post` → `None` → 422 e `save_recipe` non chiamato;
  - duplicato con parametri di query diversi → 409;
  - download immagine fallito → 200 senza immagine.

### 6. README.md (in inglese)
Nella lista Features e nella sezione Telegram Bot: si può condividere un post/reel Instagram; la didascalia
viene letta dai metadati della pagina (può non funzionare se Instagram blocca la richiesta: in quel caso si può
incollare il testo); la copertina viene salvata in `images/` del repo dei dati.

## Criteri di accettazione
- `make lint`, `cd backend && uv run ruff format --check .`, `make test` passano.
- In locale (`make dev-backend`), `curl -X POST localhost:8000/recipes/from-url -H "X-API-Key: <API_KEY>"
  -H "Content-Type: application/json" -d '{"url":"https://www.instagram.com/reel/DeT0hAqBIp6/?obrf=x"}'`
  restituisce la schiacciata di zucca con ingredienti dalla didascalia, `source_type` `instagram`, un'immagine
  `raw.githubusercontent.com/…/images/<id>.jpg` raggiungibile. **Attenzione: scrive davvero nel repo dei dati**;
  farlo solo se l'utente è d'accordo, e poi cancellare la ricetta di prova da sito o con `DELETE /recipes/{id}`.
- Link non-Instagram: comportamento invariato (i test esistenti passano).
