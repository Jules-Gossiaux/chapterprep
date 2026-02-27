"""
Logique métier des chapitres (CRUD, vérification ownership).
L'appel Gemini est dans vocabulary_service.py.
"""
from fastapi import HTTPException, status

from models import ChapterCreateRequest, ChapterResponse
from repositories import chapter_repository


def create_chapter(user_id: int, data: ChapterCreateRequest) -> ChapterResponse:
    """Persiste le chapitre en base et retourne le modèle de réponse."""
    new_id = chapter_repository.create_chapter(
        user_id=user_id,
        title=data.title,
        chapter_number=data.chapter_number,
        text=data.text,
        target_language=data.target_language,
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


def get_chapter(chapter_id: int, user_id: int) -> ChapterResponse:
    """
    Retourne un chapitre en vérifiant l'ownership.
    Retourne toujours 403 — que le chapitre n'existe pas ou qu'il appartienne
    à un autre user — pour ne pas leaker l'existence des IDs.
    """
    row = chapter_repository.get_chapter_by_id(chapter_id)
    if not row or row["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")
    return ChapterResponse(**dict(row))


def delete_chapter(chapter_id: int, user_id: int) -> None:
    """Supprime un chapitre. Même réponse 403 que get_chapter si non accessible."""
    row = chapter_repository.get_chapter_by_id(chapter_id)
    if not row or row["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")
    chapter_repository.delete_chapter(chapter_id)
