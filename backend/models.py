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


# ── Chapitres ────────────────────────────────────────────────

_ALLOWED_LEVELS = {"A1", "A2", "B1", "B2", "C1", "C2"}
_ALLOWED_TRANSLATION_MODES = {"translation", "definition"}


class ChapterCreateRequest(BaseModel):
    title:            str           # titre du livre
    chapter_number:   int           # numéro du chapitre
    text:             str           # texte collé
    target_language:  str           # ex: "anglais"
    words_to_extract: int           # nombre de mots que Gemini doit extraire (1–50)
    level:            str           # A1 à C2
    translation_mode: str           # "translation" ou "definition"

    @field_validator("title", "text", "target_language")
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Ce champ ne peut pas être vide.")
        return v

    @field_validator("chapter_number")
    @classmethod
    def chapter_number_valid(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Le numéro de chapitre doit être supérieur à 0.")
        return v

    @field_validator("words_to_extract")
    @classmethod
    def words_to_extract_valid(cls, v: int) -> int:
        if not (1 <= v <= 50):
            raise ValueError("Le nombre de mots doit être compris entre 1 et 50.")
        return v

    @field_validator("level")
    @classmethod
    def level_valid(cls, v: str) -> str:
        if v not in _ALLOWED_LEVELS:
            raise ValueError(f"Niveau invalide. Valeurs acceptées : {sorted(_ALLOWED_LEVELS)}")
        return v

    @field_validator("translation_mode")
    @classmethod
    def translation_mode_valid(cls, v: str) -> str:
        if v not in _ALLOWED_TRANSLATION_MODES:
            raise ValueError(f"Mode invalide. Valeurs acceptées : {sorted(_ALLOWED_TRANSLATION_MODES)}")
        return v


class ChapterResponse(BaseModel):
    id:               int
    user_id:          int
    title:            str
    chapter_number:   int
    target_language:  str
    level:            str
    translation_mode: str
    created_at:       str


# ── Mots extraits ────────────────────────────────────────────

class WordItem(BaseModel):
    """Un mot tel que retourné par Gemini (avant confirmation)."""
    word:      str
    base_form: str
    output:    str


class ExtractionResponse(BaseModel):
    """Réponse du endpoint POST /chapters : chapitre créé + mots suggérés."""
    chapter: ChapterResponse
    words:   list[WordItem]


class WordsConfirmRequest(BaseModel):
    """Corps du endpoint POST /chapters/{id}/words : sélection finale du user."""
    words: list[WordItem]

    @field_validator("words")
    @classmethod
    def words_not_empty(cls, v: list) -> list:
        if not v:
            raise ValueError("La liste de mots ne peut pas être vide.")
        return v


class WordResponse(BaseModel):
    id:         int
    chapter_id: int
    user_id:    int
    word:       str
    base_form:  str
    output:     str
    status:     str
    created_at: str
