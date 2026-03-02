"""
Route traduction à la volée :
  POST /translate  → traduit un mot via RapidAPI (sans stockage en DB)
"""
from fastapi import APIRouter, Depends

from dependencies import get_current_user
from models import TokenData, TranslateRequest, TranslateResponse
from services import translation_service

router = APIRouter(tags=["Traduction"])


@router.post("/translate", response_model=TranslateResponse)
async def translate(
    body: TranslateRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Traduit un mot du chapitre en français via RapidAPI.
    La langue source est celle du livre associé au chapitre.
    Ne stocke rien en base.
    """
    translation = await translation_service.translate_word(
        chapter_id=body.chapter_id,
        user_id=current_user.user_id,
        word=body.word,
    )
    return TranslateResponse(word=body.word, translation=translation)
