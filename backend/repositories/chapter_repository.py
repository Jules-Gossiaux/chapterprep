"""
Toutes les requêtes SQL liées aux chapitres.
Aucune logique métier : lecture / écriture en base uniquement.
"""
import sqlite3
from database import get_connection


# ─── Lecture ─────────────────────────────────────────────────

def get_chapters_by_book(book_id: int) -> list[sqlite3.Row]:
    conn = get_connection()
    try:
        return conn.execute(
            "SELECT * FROM chapters WHERE book_id = ? ORDER BY created_at ASC",
            (book_id,),
        ).fetchall()
    finally:
        conn.close()


def get_chapter_by_id(chapter_id: int) -> sqlite3.Row | None:
    conn = get_connection()
    try:
        return conn.execute(
            "SELECT * FROM chapters WHERE id = ?", (chapter_id,)
        ).fetchone()
    finally:
        conn.close()


# ─── Écriture ─────────────────────────────────────────────────

def create_chapter(
    book_id: int,
    title: str,
    content: str,
    word_count: int,
    words_to_extract: int,
) -> int:
    """Insère un nouveau chapitre et retourne son id."""
    conn = get_connection()
    try:
        with conn:
            cursor = conn.execute(
                """
                INSERT INTO chapters (book_id, title, content, word_count, words_to_extract)
                VALUES (?, ?, ?, ?, ?)
                """,
                (book_id, title, content, word_count, words_to_extract),
            )
            return cursor.lastrowid
    finally:
        conn.close()


# ─── Suppression ─────────────────────────────────────────────

def delete_chapter(chapter_id: int) -> None:
    conn = get_connection()
    try:
        with conn:
            conn.execute("DELETE FROM chapters WHERE id = ?", (chapter_id,))
    finally:
        conn.close()
