"""
Routes livres : GET /books et POST /books.
Toutes les routes sont protégées par le token JWT (Depends(get_current_user)).
"""
from fastapi import APIRouter, Depends

from dependencies import get_current_user
from models import BookCreate, BookResponse, TokenData
from services import book_service

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("", response_model=list[BookResponse])
def list_books(current_user: TokenData = Depends(get_current_user)):
    """Retourne tous les livres de l'utilisateur connecté."""
    return book_service.get_user_books(current_user.user_id)


@router.post("", response_model=BookResponse, status_code=201)
def add_book(
    body: BookCreate,
    current_user: TokenData = Depends(get_current_user),
):
    """Crée un nouveau livre pour l'utilisateur connecté."""
    return book_service.create_book(user_id=current_user.user_id, data=body)
