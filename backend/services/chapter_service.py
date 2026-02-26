"""
Logique métier des chapitres.
"""
from fastapi import HTTPException, status

from models import ChapterCreate, ChapterResponse, recommend_words
from repositories import chapter_repository, book_repository


def _count_words(text: str) -> int:
    return len(text.split())


def get_book_chapters(book_id: int, user_id: int) -> list[ChapterResponse]:
    # Vérifie que le livre appartient à l'utilisateur
    book = book_repository.get_book_by_id(book_id)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Livre introuvable.")
    if book["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")

    rows = chapter_repository.get_chapters_by_book(book_id)
    return [ChapterResponse(**dict(row)) for row in rows]


def create_chapter(book_id: int, user_id: int, data: ChapterCreate) -> ChapterResponse:
    # Vérifie ownership du livre
    book = book_repository.get_book_by_id(book_id)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Livre introuvable.")
    if book["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")

    word_count = _count_words(data.content)
    words_to_extract = data.words_to_extract if data.words_to_extract is not None else recommend_words(word_count)

    new_id = chapter_repository.create_chapter(
        book_id=book_id,
        title=data.title,
        content=data.content,
        word_count=word_count,
        words_to_extract=words_to_extract,
    )
    row = chapter_repository.get_chapter_by_id(new_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erreur création chapitre.")
    return ChapterResponse(**dict(row))


def delete_chapter(chapter_id: int, book_id: int, user_id: int) -> None:
    # Vérifie l'ownership du livre en premier — évite de leaker l'existence du chapitre
    book = book_repository.get_book_by_id(book_id)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Livre introuvable.")
    if book["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")

    chapter = chapter_repository.get_chapter_by_id(chapter_id)
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapitre introuvable.")
    if chapter["book_id"] != book_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ce chapitre n'appartient pas à ce livre.")

    chapter_repository.delete_chapter(chapter_id)
