"""
Routes vocabulaire :
    GET  /books/{book_id}/chapters                          → liste les chapitres d'un livre
    POST /books/{book_id}/chapters                          → soumet un chapitre, appelle Gemini
    GET  /books/{book_id}/chapters/{chapter_id}             → récupère un chapitre
    DELETE /books/{book_id}/chapters/{chapter_id}           → supprime un chapitre
    POST /books/{book_id}/chapters/{chapter_id}/words       → confirme la sélection
    GET  /books/{book_id}/chapters/{chapter_id}/words       → récupère les mots
    POST /books/{book_id}/chapters/{chapter_id}/words/single → ajoute un mot unique
"""
from fastapi import APIRouter, Depends, HTTPException

from dependencies import get_current_user
from models import (
    ChapterCreateRequest,
    ChapterResponse,
    ExtractionResponse,
    SingleWordAddRequest,
    TokenData,
    WordResponse,
    WordsConfirmRequest,
)
from services import book_service, chapter_service, vocabulary_service, word_service

router = APIRouter(prefix="/books/{book_id}/chapters", tags=["Chapters"])


@router.get("", response_model=list[ChapterResponse])
def list_chapters(
    book_id: int,
    current_user: TokenData = Depends(get_current_user),
):
    """Retourne les chapitres du livre demandé (ownership vérifié)."""
    return chapter_service.get_chapters(book_id=book_id, user_id=current_user.user_id)


@router.get("/{chapter_id}", response_model=ChapterResponse)
def get_chapter(
    book_id: int,
    chapter_id: int,
    current_user: TokenData = Depends(get_current_user),
):
    """Retourne un chapitre en vérifiant l'ownership."""
    return chapter_service.get_chapter(chapter_id=chapter_id, book_id=book_id, user_id=current_user.user_id)


@router.post("", response_model=ExtractionResponse, status_code=201)
def create_chapter_and_extract(
    book_id: int,
    body: ChapterCreateRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """
    1. Persiste le chapitre en DB.
    2. Appelle Gemini pour extraire le vocabulaire.
    3. Retourne le chapitre + les mots suggérés (non stockés à ce stade).
    """
    book = book_service.get_book(book_id=book_id, user_id=current_user.user_id)
    chapter = chapter_service.create_chapter(
        user_id=current_user.user_id,
        book_id=book_id,
        data=body,
    )

    try:
        words = vocabulary_service.extract_vocabulary(
            text=body.text,
            level=body.level,
            target_language=book.language,
            word_count=body.words_to_extract,
            translation_mode=body.translation_mode,
        )
    except HTTPException:
        chapter_service.delete_chapter(
            chapter_id=chapter.id,
            book_id=book_id,
            user_id=current_user.user_id,
        )
        raise

    return ExtractionResponse(chapter=chapter, words=words)


@router.delete("/{chapter_id}", status_code=204)
def delete_chapter(
    book_id: int,
    chapter_id: int,
    current_user: TokenData = Depends(get_current_user),
):
    """Supprime un chapitre et tous ses mots (CASCADE en DB)."""
    chapter_service.delete_chapter(chapter_id=chapter_id, book_id=book_id, user_id=current_user.user_id)


@router.post("/{chapter_id}/words", response_model=list[WordResponse], status_code=201)
def confirm_words(
    book_id: int,
    chapter_id: int,
    body: WordsConfirmRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Stocke les mots que le user a conservés après sa sélection.
    Vérifie que le chapitre appartient bien à l'utilisateur connecté.
    """
    chapter_service.get_chapter(chapter_id=chapter_id, book_id=book_id, user_id=current_user.user_id)

    return word_service.confirm_words(
        chapter_id=chapter_id,
        user_id=current_user.user_id,
        words=[w.model_dump() for w in body.words],
    )


@router.get("/{chapter_id}/words", response_model=list[WordResponse])
def get_words(
    book_id: int,
    chapter_id: int,
    current_user: TokenData = Depends(get_current_user),
):
    """Retourne les mots stockés pour un chapitre (vérifie l'ownership)."""
    chapter_service.get_chapter(chapter_id=chapter_id, book_id=book_id, user_id=current_user.user_id)

    return word_service.get_words(chapter_id, current_user.user_id)


@router.post("/{chapter_id}/words/single", response_model=WordResponse, status_code=201)
def add_single_word(
    book_id: int,
    chapter_id: int,
    body: SingleWordAddRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Ajoute un mot unique découvert pendant la lecture avec le statut `to_learn`.
    Vérifie l'ownership. Retourne 409 si le mot est déjà présent.
    """
    chapter_service.get_chapter(chapter_id=chapter_id, book_id=book_id, user_id=current_user.user_id)

    return word_service.add_single_word(
        chapter_id=chapter_id,
        user_id=current_user.user_id,
        word_data=body.model_dump(),
    )
