from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routes import auth as auth_router
from routes import books as books_router
from routes import chapters as chapters_router

app = FastAPI(title="ChapterPrep API", version="0.1.0")

# ─── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # En prod, remplace par ton domaine GitHub Pages
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Initialisation de la base ───────────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()

# ─── Routers ─────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(books_router.router)
app.include_router(chapters_router.router)

# ─── Health check ────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "app": "ChapterPrep API"}
