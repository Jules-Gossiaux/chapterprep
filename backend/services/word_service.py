"""
Logique métier des mots (confirmation de sélection, ajout unitaire à la lecture).
"""
from fastapi import HTTPException, status

from models import WordResponse
from repositories import word_repository


def confirm_words(
    chapter_id: int,
    user_id: int,
    words: list[dict],
) -> list[WordResponse]:
    """
    Insère une liste de mots sélectionnés après extraction Gemini.
    Retourne tous les mots du chapitre pour cet utilisateur.
    """
    word_repository.create_words(chapter_id=chapter_id, user_id=user_id, words=words)
    rows = word_repository.get_words_by_chapter_and_user(chapter_id, user_id)
    return [WordResponse(**dict(r)) for r in rows]


def get_words(chapter_id: int, user_id: int) -> list[WordResponse]:
    """Retourne les mots stockés pour un chapitre et un utilisateur."""
    rows = word_repository.get_words_by_chapter_and_user(chapter_id, user_id)
    return [WordResponse(**dict(r)) for r in rows]


def add_single_word(
    chapter_id: int,
    user_id: int,
    word_data: dict,
) -> WordResponse:
    """
    Ajoute un mot unique découvert pendant la lecture avec le statut `to_learn`.
    Lève 409 si le mot existe déjà pour ce chapitre et cet utilisateur.
    """
    existing = word_repository.get_word_by_chapter_user_and_word(
        chapter_id=chapter_id,
        user_id=user_id,
        word=word_data["word"],
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Le mot « {word_data['word']} » est déjà dans ta liste pour ce chapitre.",
        )

    word_id = word_repository.create_single_word(
        chapter_id=chapter_id,
        user_id=user_id,
        word_data=word_data,
    )
    row = word_repository.get_word_by_id(word_id)
    return WordResponse(**dict(row))
