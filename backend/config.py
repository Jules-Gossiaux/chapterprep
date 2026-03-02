from dotenv import load_dotenv
import os
from pathlib import Path

# Charge backend/.env
load_dotenv()                                         # backend/.env

SECRET_KEY: str = os.getenv("SECRET_KEY", "dev_secret_change_me")
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
DATABASE_URL: str = os.getenv("DATABASE_URL", "./chapterprep.db")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
RAPIDAPI_KEY: str = os.getenv("RAPIDAPI_KEY", "")

if os.getenv("APP_ENV") == "production" and SECRET_KEY == "dev_secret_change_me":
    raise RuntimeError(
        "SECRET_KEY non définie en production. "
        "Renseigne la variable d'environnement SECRET_KEY."
    )
