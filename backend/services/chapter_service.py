"""
Logique métier des chapitres (CRUD, vérification ownership).
L'appel Gemini est dans vocabulary_service.py.
"""
from fastapi import HTTPException, status

from models import ChapterCreateRequest, ChapterResponse
from repositories import book_repository, chapter_repository


def create_chapter(user_id: int, book_id: int, data: ChapterCreateRequest) -> ChapterResponse:
    """Persiste le chapitre en base et retourne le modèle de réponse."""
    new_id = chapter_repository.create_chapter(
        user_id=user_id,
        book_id=book_id,
        chapter_number=data.chapter_number,
        text=data.text,
        level=data.level,
        translation_mode=data.translation_mode,
    )
    row = chapter_repository.get_chapter_by_id(new_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la création du chapitre.",
        )
    return ChapterResponse(**dict(row))


def get_chapters(book_id: int, user_id: int) -> list[ChapterResponse]:
    """Retourne les chapitres d'un livre après vérification d'ownership."""
    book = book_repository.get_book_by_id(book_id)
    if not book or book["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")

    rows = chapter_repository.get_chapters_by_book_and_user(book_id=book_id, user_id=user_id)
    return [ChapterResponse(**dict(row)) for row in rows]


def get_chapter(chapter_id: int, book_id: int, user_id: int) -> ChapterResponse:
    """
    Retourne un chapitre en vérifiant l'ownership.
    Retourne toujours 403 — que le chapitre n'existe pas ou qu'il appartienne
    à un autre user — pour ne pas leaker l'existence des IDs.
    """
    row = chapter_repository.get_chapter_by_id(chapter_id)
    if not row or row["user_id"] != user_id or row["book_id"] != book_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")
    return ChapterResponse(**dict(row))


def delete_chapter(chapter_id: int, book_id: int, user_id: int) -> None:
    """Supprime un chapitre. Même réponse 403 que get_chapter si non accessible."""
    row = chapter_repository.get_chapter_by_id(chapter_id)
    if not row or row["user_id"] != user_id or row["book_id"] != book_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")
    chapter_repository.delete_chapter(chapter_id)


def mark_chapter_done(chapter_id: int, book_id: int, user_id: int) -> None:
    """Passe le statut du chapitre à 'done' après vérification d'ownership."""
    row = chapter_repository.get_chapter_by_id(chapter_id)
    if not row or row["user_id"] != user_id or row["book_id"] != book_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")
    chapter_repository.update_chapter_status(chapter_id, "done")
