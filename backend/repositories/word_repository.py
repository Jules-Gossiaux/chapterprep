"""
Toutes les requêtes SQL liées aux mots.
Aucune logique métier : lecture / écriture en base uniquement.
"""
import sqlite3
from database import get_connection


# ─── Écriture ────────────────────────────────────────────────

def create_words(
    chapter_id: int,
    user_id: int,
    words: list[dict],
) -> list[int]:
    """
    Insère une liste de mots en une transaction.
    Chaque dict doit avoir : word, base_form, output.
    Retourne la liste des ids insérés.
    """
    conn = get_connection()
    ids: list[int] = []
    try:
        with conn:
            for w in words:
                cursor = conn.execute(
                    """
                    INSERT INTO words (chapter_id, user_id, word, base_form, output, status)
                    VALUES (?, ?, ?, ?, ?, 'to_learn')
                    """,
                    (chapter_id, user_id, w["word"], w["base_form"], w["output"]),
                )
                ids.append(cursor.lastrowid)
    finally:
        conn.close()
    return ids


# ─── Lecture ─────────────────────────────────────────────────

def get_words_by_chapter(chapter_id: int) -> list[sqlite3.Row]:
    conn = get_connection()
    try:
        return conn.execute(
            "SELECT * FROM words WHERE chapter_id = ? ORDER BY created_at ASC",
            (chapter_id,),
        ).fetchall()
    finally:
        conn.close()


def get_words_by_chapter_and_user(chapter_id: int, user_id: int) -> list[sqlite3.Row]:
    """Filtre par chapter_id ET user_id — évite les fuites entre utilisateurs."""
    conn = get_connection()
    try:
        return conn.execute(
            "SELECT * FROM words WHERE chapter_id = ? AND user_id = ? ORDER BY created_at ASC",
            (chapter_id, user_id),
        ).fetchall()
    finally:
        conn.close()


def get_word_by_id(word_id: int) -> sqlite3.Row | None:
    conn = get_connection()
    try:
        return conn.execute(
            "SELECT * FROM words WHERE id = ?", (word_id,)
        ).fetchone()
    finally:
        conn.close()
