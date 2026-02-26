"""
Toutes les requêtes SQL liées aux utilisateurs.
Ce fichier ne contient AUCUNE logique métier : il se contente de lire / écrire en base.
"""
import sqlite3
from database import get_connection


# ─── Lecture ─────────────────────────────────────────────────

def get_user_by_username(username: str) -> sqlite3.Row | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()
        return row
    finally:
        conn.close()


def get_user_by_email(email: str) -> sqlite3.Row | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?", (email,)
        ).fetchone()
        return row
    finally:
        conn.close()


def get_user_by_id(user_id: int) -> sqlite3.Row | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        return row
    finally:
        conn.close()


# ─── Écriture ─────────────────────────────────────────────────

def create_user(username: str, email: str, hashed_password: str) -> int:
    """Insère un nouvel utilisateur et retourne son id."""
    conn = get_connection()
    try:
        with conn:
            cursor = conn.execute(
                "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
                (username, email, hashed_password),
            )
            return cursor.lastrowid
    finally:
        conn.close()
