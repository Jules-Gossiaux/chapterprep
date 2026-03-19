from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from dependencies import get_current_user
from models import TokenData
from services.pdf_service import extract_chapters_from_pdf

router = APIRouter(prefix="/utils", tags=["Utils"])

@router.post("/pdf/preview")
async def preview_pdf(
    file: UploadFile = File(...),
    words_per_chapter: int = Form(500),
    current_user: TokenData = Depends(get_current_user)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés.")
    
    content = await file.read()
    try:
        chapters = extract_chapters_from_pdf(content, words_per_chapter)
        if not chapters:
            raise HTTPException(status_code=400, detail="Aucun texte n'a pu être extrait du PDF.")
        return {"chapter_count": len(chapters), "chapters": chapters}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur lors du traitement du PDF.")