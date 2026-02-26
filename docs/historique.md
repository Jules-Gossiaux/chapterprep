# Historique des modifications — ChapterPrep

---

## Page d'inscription et de connexion (frontend)

- `index.html` — créé : structure HTML avec onglets connexion / inscription, deux formulaires, élément `#login-success`
- `style.css` — créé : variables CSS, styles de base, card, onglets, formulaires, bouton, spinner
- `app.js` — créé : logique onglets, fetch login (FormData OAuth2) et register (JSON), localStorage, validation côté client

---

## Routes /auth/register et /auth/login + architecture backend (routes / services / repositories)

- `backend/requirements.txt` — créé : fastapi, uvicorn, python-multipart, pydantic[email], passlib[bcrypt], python-jose, python-dotenv
- `backend/.env.example` — créé : template des variables d'environnement sans valeurs sensibles
- `backend/config.py` — créé : chargement des variables d'env avec python-dotenv
- `backend/database.py` — créé : connexion SQLite, row_factory, PRAGMA foreign_keys, init_db() avec table users
- `backend/models.py` — créé : RegisterRequest (validators username + password), RegisterResponse, LoginResponse, TokenData
- `backend/repositories/__init__.py` — créé : fichier d'init du package
- `backend/repositories/user_repository.py` — créé : get_user_by_username, get_user_by_email, get_user_by_id, create_user
- `backend/services/__init__.py` — créé : fichier d'init du package
- `backend/services/auth_service.py` — créé : hash_password, verify_password, create_access_token, decode_access_token, register_user, login_user
- `backend/routes/__init__.py` — créé : fichier d'init du package
- `backend/routes/auth.py` — créé : POST /auth/register, POST /auth/login (OAuth2PasswordRequestForm)
- `backend/main.py` — créé : app FastAPI, CORS, startup init_db, inclusion auth_router, health check

---

## Vérification de l'email

- `backend/models.py` — modifié : ajout du field_validator `email_valid` (strip + lower) dans RegisterRequest

---

## Correction CORS (site inaccessible)

- `backend/main.py` — modifié : `allow_origins=["*"]` + `allow_credentials=False` pour autoriser les requêtes depuis `file://`

---

## Corrections multiples (5 points)

- `backend/.env` — créé : SECRET_KEY hex 64 chars, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, DATABASE_URL
- `backend/config.py` — modifié : RuntimeError si APP_ENV=production et SECRET_KEY est la valeur par défaut
- `backend/requirements.txt` — modifié : `passlib[bcrypt]` → `passlib` (pbkdf2_sha256 ne nécessite pas bcrypt)
- `app.js` — modifié : localStorage.setItem("user_id") après login, sélecteur `loginSuccess`, reset dans handler onglets et submit login
- `index.html` — modifié : ajout de `<p id="login-success">` dédié entre le message d'erreur et le bouton
- `style.css` — modifié : ajout de la classe `.form__success` (couleur verte)

---

## Dashboard

- `app.html` — créé : structure navbar, bandeau bienvenue, grille livres, état vide, modale ajout livre
- `dashboard.css` — créé : navbar sticky, boutons outline/ghost, welcome, empty-state, book-grid, book-card, modale, select
- `dashboard.js` — créé : auth guard, logout, openModal/closeModal, renderBook, renderBookList, loadBooks, addBookForm, deleteBook

---

## Routes GET /books et POST /books

- `backend/database.py` — modifié : ajout table books (FK → users ON DELETE CASCADE)
- `backend/models.py` — modifié : ajout Optional, BookCreate (validators title + language), BookResponse
- `backend/repositories/book_repository.py` — créé : get_books_by_user, get_book_by_id, create_book
- `backend/services/book_service.py` — créé : get_user_books, create_book
- `backend/routes/books.py` — créé : GET /books, POST /books
- `backend/dependencies.py` — créé : get_current_user() injectable via Depends(HTTPBearer)
- `backend/main.py` — modifié : import et inclusion de books_router

---

## Fichier architecture.md

- `docs/architecture.md` — créé : arborescence, architecture en couches, schéma SQL, flux auth JWT, flux utilisateur, tableau sécurité, variables d'env, cible de déploiement

---

## Bouton supprimer pour le livre

- `backend/repositories/book_repository.py` — modifié : ajout de delete_book()
- `backend/services/book_service.py` — modifié : ajout de delete_book() avec vérification ownership (403) et existence (404)
- `backend/routes/books.py` — modifié : ajout DELETE /books/{book_id} → 204
- `dashboard.js` — modifié : renderBook restructuré avec .book-card__body et .book-card__delete, ajout de deleteBook()
- `dashboard.css` — modifié : book-card redessiné avec flexbox, ajout .book-card--deleting, .book-card__body, .book-card__delete

---

## .gitignore

- `.gitignore` — créé : exclusion de backend/.venv/, __pycache__, *.pyc, backend/.env, *.db, .DS_Store, Thumbs.db

---

## Page livre + chapitres

- `backend/database.py` — modifié : ajout table chapters (FK → books ON DELETE CASCADE, word_count, words_to_extract)
- `backend/models.py` — modifié : ajout ChapterCreate (validators title + content), ChapterResponse, recommend_words()
- `backend/repositories/chapter_repository.py` — créé : get_chapters_by_book, get_chapter_by_id, create_chapter, delete_chapter
- `backend/services/chapter_service.py` — créé : get_book_chapters, create_chapter (calcul word_count + recommandation 5%), delete_chapter (vérif ownership livre)
- `backend/routes/chapters.py` — créé : GET /books/{book_id}/chapters, POST /books/{book_id}/chapters, DELETE /books/{book_id}/chapters/{chapter_id}
- `backend/routes/books.py` — modifié : ajout GET /books/{book_id}
- `backend/services/book_service.py` — modifié : ajout get_book() avec vérification ownership
- `backend/main.py` — modifié : import et inclusion de chapters_router
- `book.html` — créé : navbar avec retour, en-tête livre, liste chapitres, état vide, modale ajout chapitre avec textarea, stats live, slider words_to_extract
- `book.css` — créé : book-header, chapter-list, chapter-card, modale large, textarea, word-stats, slider, form__hint
- `book.js` — créé : auth guard, lecture ?id= URL, loadBook, loadChapters, compteur live (updateWordStats), recommandation auto, slider, renderChapter, addChapterForm, deleteChapter
- `dashboard.js` — modifié : clic sur .book-card__body → `window.location.href = book.html?id=`

---

## Fichier historique

- `docs/historique.md` — créé : ce fichier

---

## Corrections de sécurité et qualité (5 points)

- `backend/models.py` — modifié : import `Field`, contrainte `ge=1, le=200` sur `ChapterCreate.words_to_extract`
- `backend/services/chapter_service.py` — modifié : `delete_chapter` vérifie d'abord l'ownership du livre avant d'accéder au chapitre (évite le leak d'existence)
- `app.html` — modifié : ajout de `<p id="books-error" class="section-error">` dans la section livres
- `dashboard.js` — modifié : sélection de `#books-error`, affichage du message d'erreur serveur dans `loadBooks` au lieu du silence
- `book.js` — modifié : `authFetch` lance `throw new Error("Unauthorized")` après la redirection 401 pour stopper l'exécution
- `book.js` — modifié : condition simplifiée `if (!res.ok && res.status !== 204)` → `if (!res.ok)` dans `deleteChapter`
- `style.css` — modifié : ajout de la classe `.section-error`
