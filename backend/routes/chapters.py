"""
Routes vocabulaire :
  GET  /chapters                         → liste tous les chapitres de l'utilisateur
  POST /chapters                         → soumet un chapitre, appelle Gemini, retourne les mots suggérés
  DELETE /chapters/{chapter_id}          → supprime un chapitre (et ses mots)
  POST /chapters/{chapter_id}/words      → confirme la sélection du user, stocke les mots en DB
  GET  /chapters/{chapter_id}/words      → récupère les mots stockés pour un chapitre
"""
from fastapi import APIRouter, Depends

from dependencies import get_current_user
from models import (
    ChapterCreateRequest,
    ChapterResponse,
    ExtractionResponse,
    TokenData,
    WordResponse,
    WordsConfirmRequest,
)
from repositories import word_repository
from services import chapter_service, vocabulary_service

router = APIRouter(prefix="/chapters", tags=["Chapters"])


@router.get("", response_model=list[ChapterResponse])
def list_chapters(current_user: TokenData = Depends(get_current_user)):
    """Retourne tous les chapitres de l'utilisateur connecté."""
    from repositories import chapter_repository
    rows = chapter_repository.get_chapters_by_user(current_user.user_id)
    return [ChapterResponse(**dict(r)) for r in rows]


@router.post("", response_model=ExtractionResponse, status_code=201)
def create_chapter_and_extract(
    body: ChapterCreateRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """
    1. Persiste le chapitre en DB.
    2. Appelle Gemini pour extraire le vocabulaire.
    3. Retourne le chapitre + les mots suggérés (non stockés à ce stade).
    """
    chapter = chapter_service.create_chapter(user_id=current_user.user_id, data=body)

    words = vocabulary_service.extract_vocabulary(
        text=body.text,
        level=body.level,
        target_language=body.target_language,
        word_count=body.words_to_extract,
        translation_mode=body.translation_mode,
    )

    return ExtractionResponse(chapter=chapter, words=words)


@router.delete("/{chapter_id}", status_code=204)
def delete_chapter(
    chapter_id: int,
    current_user: TokenData = Depends(get_current_user),
):
    """Supprime un chapitre et tous ses mots (CASCADE en DB)."""
    chapter_service.delete_chapter(chapter_id=chapter_id, user_id=current_user.user_id)


@router.post("/{chapter_id}/words", response_model=list[WordResponse], status_code=201)
def confirm_words(
    chapter_id: int,
    body: WordsConfirmRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Stocke les mots que le user a conservés après sa sélection.
    Vérifie que le chapitre appartient bien à l'utilisateur connecté.
    """
    chapter_service.get_chapter(chapter_id=chapter_id, user_id=current_user.user_id)

    word_repository.create_words(
        chapter_id=chapter_id,
        user_id=current_user.user_id,
        words=[w.model_dump() for w in body.words],
    )

    # Filtre par user_id directement en SQL — robuste même en accès concurrent
    rows = word_repository.get_words_by_chapter_and_user(chapter_id, current_user.user_id)
    return [WordResponse(**dict(r)) for r in rows]


@router.get("/{chapter_id}/words", response_model=list[WordResponse])
def get_words(
    chapter_id: int,
    current_user: TokenData = Depends(get_current_user),
):
    """Retourne les mots stockés pour un chapitre (vérifie l'ownership)."""
    chapter_service.get_chapter(chapter_id=chapter_id, user_id=current_user.user_id)

    rows = word_repository.get_words_by_chapter_and_user(chapter_id, current_user.user_id)
    return [WordResponse(**dict(r)) for r in rows]
