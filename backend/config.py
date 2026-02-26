from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY: str = os.getenv("SECRET_KEY", "dev_secret_change_me")
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
DATABASE_URL: str = os.getenv("DATABASE_URL", "./chapterprep.db")

if os.getenv("APP_ENV") == "production" and SECRET_KEY == "dev_secret_change_me":
    raise RuntimeError(
        "SECRET_KEY non définie en production. "
        "Renseigne la variable d'environnement SECRET_KEY."
    )
