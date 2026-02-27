"""
Logique d'extraction de vocabulaire via l'API Gemini.
Responsabilités : construction du prompt, appel HTTP, parsing JSON.
"""
import json
import re

import httpx
from fastapi import HTTPException, status

from config import GEMINI_API_KEY
from models import WordItem
from prompts.extract_vocabulary import build_prompt

_GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)
_TIMEOUT_SECONDS = 30


def extract_vocabulary(
    text: str,
    level: str,
    target_language: str,
    word_count: int,
    translation_mode: str,
) -> list[WordItem]:
    """
    Appelle Gemini et retourne la liste de mots extraits.

    Raises:
        HTTPException 502 — si l'API Gemini est injoignable ou renvoie une erreur.
        HTTPException 502 — si la réponse ne contient pas de JSON valide.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clé API Gemini non configurée (GEMINI_API_KEY manquante).",
        )

    prompt = build_prompt(
        text=text,
        level=level,
        target_language=target_language,
        word_count=word_count,
        translation_mode=translation_mode,
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2},
    }

    # ── Appel HTTP ───────────────────────────────────────────
    try:
        response = httpx.post(
            _GEMINI_ENDPOINT,
            headers={"x-goog-api-key": GEMINI_API_KEY},
            json=payload,
            timeout=_TIMEOUT_SECONDS,
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="L'API Gemini n'a pas répondu dans les délais.",
        )
    except httpx.ConnectError:
        print("STATUS GEMINI:", response.status_code)
        print("BODY GEMINI:", response.text[:500])  
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Impossible de joindre l'API Gemini.",
        )

    if not response.is_success:
        error_msg = response.json().get("error", {}).get("message", response.text)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur Gemini ({response.status_code}) : {error_msg}",
        )

    # ── Extraction du texte brut ─────────────────────────────
    try:
        raw_text: str = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Réponse Gemini dans un format inattendu.",
        )

    # ── Nettoyage : supprime les blocs ```json ... ``` éventuels ──
    raw_text = raw_text.strip()
    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
    raw_text = re.sub(r"\s*```$", "", raw_text)

    # ── Parsing JSON ─────────────────────────────────────────
    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini n'a pas retourné un JSON valide.",
        )

    if not isinstance(data, list):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="La réponse Gemini doit être un tableau JSON.",
        )

    # ── Validation et construction des WordItem ───────────────
    words: list[WordItem] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        word = str(item.get("word", "")).strip()
        base_form = str(item.get("base_form", "")).strip()
        output = str(item.get("output", "")).strip()
        if word and base_form and output:
            words.append(WordItem(word=word, base_form=base_form, output=output))

    if not words:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini n'a retourné aucun mot valide.",
        )

    return words
