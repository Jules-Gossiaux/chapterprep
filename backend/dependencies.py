"""
Dépendances FastAPI réutilisables.
Injectables via Depends() dans n'importe quelle route protégée.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from models import TokenData
from services import auth_service

_bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> TokenData:
    """
    Extrait et valide le token JWT du header Authorization: Bearer <token>.
    Retourne un TokenData(user_id, username) si valide.
    Lève une HTTPException 401 sinon.
    """
    return auth_service.decode_access_token(credentials.credentials)
