import json
import re

from google import genai
from google.genai import types

from config import get_settings

_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        s = get_settings()
        _client = genai.Client(api_key=s.gemini_api_key)
    return _client


async def _chat(prompt: str) -> str:
    s = get_settings()
    client = _get_client()

    response = await client.aio.models.generate_content(
        model=s.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json", temperature=0.1
        ),
    )
    return response.text


def _parse_json(text: str) -> dict:
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`")
    return json.loads(text)


async def extract_recipe(content: str) -> dict:
    prompt = f"""Sei un assistente che estrae dati strutturati da ricette di cucina.
Analizza il seguente testo e restituisci SOLO un JSON valido (senza markdown) con questa struttura:
{{
  "title": "nome della ricetta in italiano",
  "description": "breve descrizione (1-2 frasi)",
  "ingredients": ["ingrediente 1 con quantità", "ingrediente 2 con quantità"],
  "steps": ["step 1", "step 2"],
  "prep_time": <minuti interi o null>,
  "cook_time": <minuti interi o null>,
  "servings": <numero porzioni intero o null>,
  "difficulty": "facile" oppure "medio" oppure "difficile" oppure null,
  "categories": ["categoria1", "categoria2"],
  "image_urls": ["url immagine 1", "url immagine 2"],
  "video_urls": ["url video se presente"],
  "notes": "note aggiuntive opzionali o null"
}}

Categorie possibili (scegli quelle pertinenti):
primi, secondi, contorni, dolci, antipasti, zuppe, insalate, pizza, pane, colazione, bevande, vegetariano, vegano, senza glutine, pesce, carne, veloce

Testo:
{content}"""

    raw = await _chat(prompt)
    return _parse_json(raw)
