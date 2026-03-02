"""
Logique métier de traduction à la volée via RapidAPI Deep Translate.
Ne stocke rien en base.
"""
import httpx
from fastapi import HTTPException, status

import config
from repositories import chapter_repository


async def translate_word(chapter_id: int, user_id: int, word: str) -> str:
    """
    Vérifie l'ownership du chapitre, puis appelle RapidAPI pour traduire `word`
    depuis la langue du livre vers le français.

    Lève 403 si le chapitre n'existe pas ou n'appartient pas à l'utilisateur.
    Lève 502 si RapidAPI échoue (erreur HTTP ou réseau).
    """
    row = chapter_repository.get_chapter_with_language(chapter_id)
    if not row or row["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")

    source_language = row["language"]

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://deep-translate1.p.rapidapi.com/language/translate/v2",
                json={"q": word, "source": source_language, "target": "fr"},
                headers={
                    "x-rapidapi-key": config.RAPIDAPI_KEY,
                    "x-rapidapi-host": "deep-translate1.p.rapidapi.com",
                },
                timeout=10.0,
            )
            res.raise_for_status()
            return res.json()["data"]["translations"]["translatedText"]
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Le service de traduction est indisponible ({exc.response.status_code}).",
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Impossible de joindre le service de traduction.",
        )
