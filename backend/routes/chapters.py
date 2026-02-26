"""
Routes chapitres — imbriquées sous /books/{book_id}/chapters.
"""
from fastapi import APIRouter, Depends

from dependencies import get_current_user
from models import ChapterCreate, ChapterResponse, TokenData
from services import chapter_service

router = APIRouter(prefix="/books/{book_id}/chapters", tags=["Chapters"])


@router.get("", response_model=list[ChapterResponse])
def list_chapters(
    book_id: int,
    current_user: TokenData = Depends(get_current_user),
):
    """Retourne tous les chapitres d'un livre (vérifie l'ownership)."""
    return chapter_service.get_book_chapters(book_id=book_id, user_id=current_user.user_id)


@router.post("", response_model=ChapterResponse, status_code=201)
def add_chapter(
    book_id: int,
    body: ChapterCreate,
    current_user: TokenData = Depends(get_current_user),
):
    """Crée un chapitre. Calcule word_count et words_to_extract automatiquement."""
    return chapter_service.create_chapter(book_id=book_id, user_id=current_user.user_id, data=body)


@router.delete("/{chapter_id}", status_code=204)
def remove_chapter(
    book_id: int,
    chapter_id: int,
    current_user: TokenData = Depends(get_current_user),
):
    """Supprime un chapitre (vérifie l'ownership du livre)."""
    chapter_service.delete_chapter(chapter_id=chapter_id, book_id=book_id, user_id=current_user.user_id)
