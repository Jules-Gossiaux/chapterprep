"""
Logique métier des livres.
Orchestre les validations et délègue le SQL au repository.
"""
from fastapi import HTTPException, status

from models import BookCreate, BookResponse
from repositories import book_repository


def delete_book(book_id: int, user_id: int) -> None:
    row = book_repository.get_book_by_id(book_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Livre introuvable.",
        )
    if row["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas autorisé à supprimer ce livre.",
        )
    book_repository.delete_book(book_id)


def get_book(book_id: int, user_id: int) -> BookResponse:
    row = book_repository.get_book_by_id(book_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Livre introuvable.")
    if row["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")
    return BookResponse(**dict(row))


def get_user_books(user_id: int) -> list[BookResponse]:
    rows = book_repository.get_books_by_user(user_id)
    return [BookResponse(**dict(row)) for row in rows]


def create_book(user_id: int, data: BookCreate) -> BookResponse:
    new_id = book_repository.create_book(
        user_id=user_id,
        title=data.title,
        author=data.author,
        language=data.language,
    )

    row = book_repository.get_book_by_id(new_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la création du livre.",
        )
    return BookResponse(**dict(row))
