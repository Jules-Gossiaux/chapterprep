"""
Toutes les requêtes SQL liées aux livres.
Aucune logique métier : lecture / écriture en base uniquement.
"""
import sqlite3
from database import get_connection


# ─── Lecture ─────────────────────────────────────────────────

def get_books_by_user(user_id: int) -> list[sqlite3.Row]:
    conn = get_connection()
    try:
        return conn.execute(
            "SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    finally:
        conn.close()


def get_book_by_id(book_id: int) -> sqlite3.Row | None:
    conn = get_connection()
    try:
        return conn.execute(
            "SELECT * FROM books WHERE id = ?", (book_id,)
        ).fetchone()
    finally:
        conn.close()


# ─── Suppression ────────────────────────────────────────────

def delete_book(book_id: int) -> None:
    conn = get_connection()
    try:
        with conn:
            conn.execute("DELETE FROM books WHERE id = ?", (book_id,))
    finally:
        conn.close()


# ─── Écriture ─────────────────────────────────────────────────

def create_book(user_id: int, title: str, author: str | None, language: str) -> int:
    """Insère un nouveau livre et retourne son id."""
    conn = get_connection()
    try:
        with conn:
            cursor = conn.execute(
                "INSERT INTO books (user_id, title, author, language) VALUES (?, ?, ?, ?)",
                (user_id, title, author, language),
            )
            return cursor.lastrowid
    finally:
        conn.close()
