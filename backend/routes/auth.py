"""
Routes d'authentification : /auth/register et /auth/login.
Ce fichier ne contient que la définition des endpoints FastAPI.
Toute la logique métier est dans services/auth_service.py.
"""
from fastapi import APIRouter
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends

from models import LoginResponse, RegisterRequest, RegisterResponse
from services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(body: RegisterRequest):
    """
    Crée un nouveau compte utilisateur.
    Body JSON : { username, email, password }
    """
    return auth_service.register_user(
        username=body.username,
        email=body.email,
        password=body.password,
    )


@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Connecte un utilisateur et retourne un token JWT.
    Body form-data : { username, password }  (standard OAuth2)
    """
    return auth_service.login_user(
        username=form_data.username,
        password=form_data.password,
    )
