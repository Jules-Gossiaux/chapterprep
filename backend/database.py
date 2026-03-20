import sqlite3
from config import DATABASE_URL


def get_connection() -> sqlite3.Connection:
    """Retourne une connexion SQLite avec row_factory activé (accès par nom de colonne)."""
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Crée les tables si elles n'existent pas encore."""
    conn = get_connection()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                username   TEXT    NOT NULL UNIQUE,
                email      TEXT    NOT NULL UNIQUE,
                password   TEXT    NOT NULL,
                created_at TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS books (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title      TEXT    NOT NULL,
                author     TEXT,
                language   TEXT    NOT NULL DEFAULT 'fr',
                created_at TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chapters (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                book_id          INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
                chapter_number   INTEGER NOT NULL,
                title            TEXT,
                text             TEXT    NOT NULL,
                level            TEXT    NOT NULL,
                translation_mode TEXT    NOT NULL,
                status           TEXT    NOT NULL DEFAULT 'pending',
                created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        chapter_columns = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(chapters)").fetchall()
        }
        if "status" not in chapter_columns:
            conn.execute(
                "ALTER TABLE chapters ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'"
            )
        if "title" not in chapter_columns:
            conn.execute(
                "ALTER TABLE chapters ADD COLUMN title TEXT"
            )
        conn.execute("""
            CREATE TABLE IF NOT EXISTS words (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
                user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                word       TEXT    NOT NULL,
                base_form  TEXT    NOT NULL,
                output     TEXT    NOT NULL,
                status     TEXT    NOT NULL DEFAULT 'to_learn',
                created_at TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
    conn.close()
