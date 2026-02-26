"""
Logique métier de l'authentification.
Ce fichier orchestre : hachage de mot de passe, vérification, création de token JWT.
Il ne fait pas de requêtes SQL directement — il délègue au repository.
"""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.hash import pbkdf2_sha256

import config
from models import LoginResponse, RegisterResponse, TokenData
from repositories import user_repository


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
    return RegisterResponse(id=new_id, username=username, email=email)


# ─── Connexion ───────────────────────────────────────────────

def login_user(username: str, password: str) -> LoginResponse:
    user = user_repository.get_user_by_username(username)
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nom d'utilisateur ou mot de passe incorrect.",
        )

    token_data = TokenData(user_id=user["id"], username=user["username"])
    token = create_access_token(token_data)
    return LoginResponse(
        access_token=token,
        user_id=user["id"],
        username=user["username"],
    )
