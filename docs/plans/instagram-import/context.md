# Feature: Import ricette da Instagram

> Condividere un post o un reel Instagram sul bot Telegram e ottenere la ricetta salvata.

## Overview
L'utente salva spesso ricette viste su Instagram. Vuole poter usare "Condividi" su Instagram verso il bot
Telegram (`@cekk_recipe_bot`) e avere la ricetta estratta e salvata come per gli altri siti. Oggi il link
arriva al bot come URL e finisce in `POST /recipes/from-url`, che con Instagram non funziona.

## Diagnosi (verificata il 2026-10-13)
Test sul reel `https://www.instagram.com/reel/DeT0hAqBIp6/` (schiacciata di zucca, @claudiamanciniph):

- **User-agent da browser** (come oggi in `trafilatura.fetch_url`, `backend/main.py`): pagina di ~630 KB
  senza la didascalia, né in `<meta>` né nel corpo. Il backend non ha niente di utile da passare a Gemini.
- **User-agent da crawler di anteprime** (`facebookexternalhit/1.1`, `Googlebot/2.1`,
  `TelegramBot (like TwitterBot)`): `<meta name="description">` contiene la **didascalia completa** (874
  caratteri, non troncata), nel formato
  `10K likes, 151 comments - claudiamanciniph on October 10, 2026: "<didascalia>"`, con ingredienti e
  procedimento interi. Sono presenti anche `og:image` (copertina del reel) e `og:url` canonico
  (`https://www.instagram.com/claudiamanciniph/reel/DeT0hAqBIp6/`).
- Il test è stato fatto da una rete domestica, **non da Render**. Instagram potrebbe bloccare o mostrare il
  login agli IP dei datacenter: va verificato in produzione.
- Il link condiviso contiene parametri di tracciamento (`?obrf=…`, spesso `?igsh=…`): lo stesso post può
  arrivare con URL diversi, quindi il controllo duplicati per URL (`source_url` in `add_recipe_from_url`)
  non lo riconoscerebbe.

## Goals
- Condividere un link Instagram (post o reel) al bot salva la ricetta presa dalla didascalia.
- Se dal link non si riesce a leggere la didascalia, il bot lo dice chiaramente invece di salvare una
  ricetta sbagliata o inventata da Gemini.
- La copertina del post/reel viene salvata come immagine della ricetta (scaricata e conservata nel repo dei
  dati, perché gli URL di `cdninstagram.com` scadono).
- Come ripiego, l'utente può mandare al bot uno o più **screenshot** (anche come album) e Gemini legge la
  ricetta dalle immagini.

## Out of scope
- API ufficiali di Instagram/Meta (richiedono un'app Meta approvata).
- Scraping con login a un account Instagram (contro i termini d'uso, fragile).
- Estrarre la ricetta dal video o dall'audio di un reel quando la didascalia non la contiene.
- Caricare screenshot dal sito web (gli screenshot arrivano solo dal bot).
- Salvare gli screenshot stessi come immagini della ricetta.

## Key flows / behavior
1. L'utente su Instagram tocca "Condividi" → Telegram → `@cekk_recipe_bot`. Al bot arriva il link.
2. Il bot lo manda a `POST /recipes/from-url` come oggi.
3. Il backend riconosce un URL Instagram, scarica la pagina con uno user-agent da crawler di anteprime e
   legge la didascalia da `<meta name="description">`.
4. Didascalia trovata → Gemini estrae la ricetta come per il testo libero → salvataggio, con `source_url`
   pulito dai parametri di tracciamento.
5. Didascalia non trovata (login, blocco, post senza testo) → errore chiaro; il bot suggerisce di mandare
   uno screenshot o il testo della didascalia copiato a mano (che il bot gestisce già come testo libero).
6. Ripiego screenshot: l'utente manda una o più foto al bot (eventualmente come album, con o senza
   didascalia Telegram). Il bot le raccoglie, le manda al backend e Gemini estrae la ricetta dalle immagini.

Immagini: la copertina viene salvata nel repo dei dati (`cekk/recipes-data`, oggi **pubblico**) e
referenziata in `image_urls` con un URL `raw.githubusercontent.com`, così il frontend la mostra senza modifiche.

Lo stesso endpoint è usato dal sito ("Salva da URL"), quindi il miglioramento vale anche lì.

## Screenshots
_None yet — drop images into `assets/` and ask to have them referenced here._

## Open questions
- Funziona da Render? Da verificare dopo il primo deploy; se Instagram blocca gli IP di Render, il ripiego
  (testo o screenshot) diventa il flusso principale.
- Se un giorno `cekk/recipes-data` diventasse privato, i link `raw.githubusercontent.com` alle immagini
  smetterebbero di funzionare (servirebbe un endpoint del backend che le serve).
- Se la didascalia non contiene una ricetta (post generico), Gemini potrebbe inventarla: oggi vale anche
  per gli altri siti, non viene affrontato qui.
