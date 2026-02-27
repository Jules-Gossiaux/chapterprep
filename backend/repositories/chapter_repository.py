"""
Toutes les requêtes SQL liées aux chapitres.
Aucune logique métier : lecture / écriture en base uniquement.
"""
import sqlite3
from database import get_connection


# ─── Écriture ────────────────────────────────────────────────

def create_chapter(
    user_id: int,
    title: str,
    chapter_number: int,
    text: str,
    target_language: str,
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
                    (user_id, title, chapter_number, text, target_language, level, translation_mode)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (user_id, title, chapter_number, text, target_language, level, translation_mode),
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


def get_chapters_by_user(user_id: int) -> list[sqlite3.Row]:
    conn = get_connection()
    try:
        return conn.execute(
            "SELECT * FROM chapters WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
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
