"""
Logique métier de l'authentification.
Ce fichier orchestre : hachage de mot de passe, vérification, création de token JWT.
Il ne fait pas de requêtes SQL directement — il délègue au repository.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
import httpx
from jose import JWTError, jwt
from passlib.hash import pbkdf2_sha256

import config
from models import LoginResponse, MessageResponse, RegisterResponse, TokenData
from repositories import user_repository
from services import email_service


# ─── Mots de passe ───────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pbkdf2_sha256.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pbkdf2_sha256.verify(plain, hashed)


# ─── JWT ─────────────────────────────────────────────────────

def create_access_token(data: TokenData) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(data.user_id),
        "username": data.username,
        "exp": expire,
    }
    return jwt.encode(payload, config.SECRET_KEY, algorithm=config.ALGORITHM)


def decode_access_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        user_id: int = int(payload["sub"])
        username: str = payload["username"]
        return TokenData(user_id=user_id, username=username)
    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _build_verification_url(raw_token: str) -> str:
    return f"{config.BACKEND_BASE_URL}/auth/verify-email?token={raw_token}"


def _create_and_store_verification_token(user_id: int) -> str:
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires_at = (_now_utc() + timedelta(hours=config.EMAIL_VERIFICATION_EXPIRE_HOURS)).isoformat()
    user_repository.set_verification_token(user_id, token_hash, expires_at)
    return raw_token


# ─── Inscription ─────────────────────────────────────────────

def register_user(username: str, email: str, password: str) -> RegisterResponse:
    # Vérifier unicité
    if user_repository.get_user_by_username(username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce nom d'utilisateur est déjà pris.",
        )
    if user_repository.get_user_by_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette adresse email est déjà utilisée.",
        )

    hashed = hash_password(password)
    new_id = user_repository.create_user(username, email, hashed)

    raw_token = _create_and_store_verification_token(new_id)
    verify_url = _build_verification_url(raw_token)
    try:
        email_service.send_verification_email(
            to_email=email,
            username=username,
            verify_url=verify_url,
        )
    except (httpx.HTTPError, RuntimeError):
        # Le compte est cree meme si l'envoi initial echoue; l'utilisateur peut renvoyer l'email.
        pass

    return RegisterResponse(id=new_id, username=username, email=email)


# ─── Connexion ───────────────────────────────────────────────

def login_user(username: str, password: str) -> LoginResponse:
    user = user_repository.get_user_by_username(username)
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nom d'utilisateur ou mot de passe incorrect.",
        )
    if not bool(user["email_verified"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Veuillez confirmer votre adresse email.",
        )

    token_data = TokenData(user_id=user["id"], username=user["username"])
    token = create_access_token(token_data)
    return LoginResponse(
        access_token=token,
        user_id=user["id"],
        username=user["username"],
    )


def verify_email_token(raw_token: str) -> str:
    token_hash = _hash_token(raw_token)
    user = user_repository.get_user_by_verification_token_hash(token_hash)
    if not user:
        return "invalid"

    expires_raw = user["verification_token_expires_at"]
    if not expires_raw:
        return "invalid"

    try:
        expires_at = datetime.fromisoformat(expires_raw)
    except ValueError:
        return "invalid"

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if _now_utc() > expires_at:
        return "expired"

    user_repository.mark_email_verified(user["id"], _now_utc().isoformat())
    return "verified"


def resend_verification_email(email: str) -> MessageResponse:
    user = user_repository.get_user_by_email(email)
    if user and not bool(user["email_verified"]):
        raw_token = _create_and_store_verification_token(user["id"])
        verify_url = _build_verification_url(raw_token)
        try:
            email_service.send_verification_email(
                to_email=user["email"],
                username=user["username"],
                verify_url=verify_url,
            )
        except (httpx.HTTPError, RuntimeError):
            pass

    return MessageResponse(
        message="Si un compte existe pour cet email, un lien de verification a ete envoye."
    )
