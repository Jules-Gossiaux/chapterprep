"""
Toutes les requêtes SQL liées aux chapitres.
Aucune logique métier : lecture / écriture en base uniquement.
"""
import sqlite3
from database import get_connection


# ─── Écriture ────────────────────────────────────────────────

def create_chapter(
    user_id: int,
    book_id: int,
    chapter_number: int,
    text: str,
    level: str,
    translation_mode: str,
) -> int:
    """Insère un nouveau chapitre et retourne son id."""
    conn = get_connection()
    try:
        with conn:
            cursor = conn.execute(
                """
                INSERT INTO chapters
                    (user_id, book_id, chapter_number, text, level, translation_mode)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (user_id, book_id, chapter_number, text, level, translation_mode),
            )
            return cursor.lastrowid
    finally:
        conn.close()


# ─── Lecture ─────────────────────────────────────────────────

def get_chapter_by_id(chapter_id: int) -> sqlite3.Row | None:
    conn = get_connection()
    try:
        return conn.execute(
            "SELECT * FROM chapters WHERE id = ?", (chapter_id,)
        ).fetchone()
    finally:
        conn.close()


def get_chapters_by_book_and_user(book_id: int, user_id: int) -> list[sqlite3.Row]:
    conn = get_connection()
    try:
        return conn.execute(
            """
            SELECT *
            FROM chapters
            WHERE book_id = ? AND user_id = ?
            ORDER BY chapter_number ASC, created_at ASC
            """,
            (book_id, user_id),
        ).fetchall()
    finally:
        conn.close()


def delete_chapter(chapter_id: int) -> None:
    conn = get_connection()
    try:
        with conn:
            conn.execute("DELETE FROM chapters WHERE id = ?", (chapter_id,))
    finally:
        conn.close()


def get_chapter_with_language(chapter_id: int) -> sqlite3.Row | None:
    """Retourne le chapitre + la langue du livre associé via JOIN."""
    conn = get_connection()
    try:
        return conn.execute(
            """
            SELECT chapters.*, books.language
            FROM chapters
            JOIN books ON chapters.book_id = books.id
            WHERE chapters.id = ?
            """,
            (chapter_id,),
        ).fetchone()
    finally:
        conn.close()
