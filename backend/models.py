from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


# ── Inscription ──────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    email:    EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Le nom d'utilisateur doit contenir au moins 3 caractères.")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Le nom d'utilisateur ne peut contenir que des lettres, chiffres, - et _.")
        return v

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if not v:
            raise ValueError("L'adresse email est obligatoire.")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères.")
        return v


class RegisterResponse(BaseModel):
    id:       int
    username: str
    email:    str


# ── Connexion ────────────────────────────────────────────────
class LoginResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      int
    username:     str


# ── Token (usage interne) ────────────────────────────────────
class TokenData(BaseModel):
    user_id:  int
    username: str


# ── Livres ───────────────────────────────────────────────────
_ALLOWED_LANGUAGES = {"fr", "en", "es", "de", "it"}


class BookCreate(BaseModel):
    title:    str
    author:   Optional[str] = None
    language: str = "fr"

    @field_validator("title")
    @classmethod
    def title_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le titre ne peut pas être vide.")
        return v

    @field_validator("language")
    @classmethod
    def language_valid(cls, v: str) -> str:
        if v not in _ALLOWED_LANGUAGES:
            raise ValueError(f"Langue non supportée. Valeurs acceptées : {sorted(_ALLOWED_LANGUAGES)}")
        return v


class BookResponse(BaseModel):
    id:         int
    user_id:    int
    title:      str
    author:     Optional[str]
    language:   str
    created_at: str
