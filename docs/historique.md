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

---

## Extraction de vocabulaire via Gemini (nouvelle fonctionnalité)

- `backend/database.py` — modifié : refonte de la table `chapters` (user-level, suppression du FK `book_id`, ajout de `title` chaîne, `chapter_number`, `target_language`, `level`, `translation_mode`) ; ajout de la table `words` (FK → chapters ON DELETE CASCADE, `word`, `base_form`, `output`)
- `backend/models.py` — modifié : ajout de `ChapterCreateRequest` (champs : title, chapter_number, text, target_language, words_to_extract, level, translation_mode), `ChapterResponse`, `ExtractionResponse`, `WordItem`, `WordsConfirmRequest`, `WordResponse`
- `backend/config.py` — modifié : ajout de `GEMINI_API_KEY` lu depuis `.env`
- `backend/prompts/extract_vocabulary.py` — créé : template de prompt Gemini (langue, niveau, mode traduction/définition, nombre de mots)
- `backend/services/vocabulary_service.py` — créé : appel Gemini 2.5 Flash via `httpx` (clé dans le header `x-goog-api-key`), parsing JSON de la réponse, retour d'une liste de `WordItem`
- `backend/repositories/word_repository.py` — créé : `create_words`, `get_words_by_chapter_and_user`, `get_words_by_chapter`
- `backend/repositories/chapter_repository.py` — réécrit : `create_chapter`, `get_chapter_by_id`, `get_chapters_by_user`, `delete_chapter` (chapitres liés à `user_id`, plus de `book_id`)
- `backend/services/chapter_service.py` — réécrit : `create_chapter_and_extract` (crée le chapitre puis appelle Gemini), `get_chapter` (403 uniforme sans leak d'existence), `delete_chapter`
- `backend/routes/chapters.py` — réécrit : `GET /chapters`, `POST /chapters`, `DELETE /chapters/{chapter_id}`, `POST /chapters/{chapter_id}/words`, `GET /chapters/{chapter_id}/words`

---

## Corrections frontend — routes chapitres et champs renommés (5 bugs)

- `backend/models.py` — modifié : `word_count` renommé `words_to_extract` dans `ChapterCreateRequest` ; champ `level` restauré
- `backend/services/chapter_service.py` — modifié : `get_chapter` et `delete_chapter` retournent systématiquement 403 (même quand le chapitre n'existe pas) pour éviter le leak d'information
- `backend/repositories/chapter_repository.py` — modifié : ajout de `delete_chapter(chapter_id)`
- `backend/repositories/word_repository.py` — modifié : ajout de `get_words_by_chapter_and_user(chapter_id, user_id)` (filtre SQL, pas Python)
- `backend/services/vocabulary_service.py` — modifié : clé Gemini déplacée du query param `?key=` vers le header HTTP `x-goog-api-key`
- `backend/routes/chapters.py` — modifié : `word_count` → `words_to_extract` dans l'appel au service ; utilisation de `get_words_by_chapter_and_user` dans `confirm_words`
- `book.html` — modifié : anciens champs `chapter-title` / `content` remplacés par `chapter-number` (number), `target-language` (text), `chapter-level` (select A1–C2, défaut B2), `translation-mode` (select traduction/définition) ; textarea renommée `chapter-content`
- `book.js` — modifié : nouveaux sélecteurs (`chapterNumberInput`, `targetLangInput`, `levelSelect`, `translationSelect`) ; variable `currentBookTitle` ; `openModal` fait le focus sur `chapterNumberInput` ; `renderChapter` affiche `chapter_number`, `target_language`, `level` ; `loadBook` sauvegarde `currentBookTitle` ; `loadChapters` appelle `GET /chapters` et filtre par titre côté client ; formulaire soumet `POST /chapters` avec les 7 nouveaux champs ; `deleteChapter` appelle `DELETE /chapters/{id}` ; `init()` séquence `loadBook` puis `loadChapters`

---

## Sélection des mots extraits (modale deux vues)

- `book.html` — modifié : ajout du bloc `#word-selection-view` (caché par défaut) après `</form>` dans la modale : `#word-selection-hint`, `#word-list` (liste des cartes), `#word-selection-error`, boutons `#back-to-form-btn` et `#confirm-selection-btn`
- `book.js` — modifié :
  - Sélecteurs : ajout `modalTitleEl`, `wordSelectionView`, `wordListEl`, `wordSelectionHint`, `wordSelectionError`, `confirmSelectionBtn`, `backToFormBtn`
  - Variables : `pendingChapterId = null`, `pendingWords = []` stockés en JS (pas dans le DOM)
  - `openModal()` : réinitialise le titre ("Nouveau chapitre") et masque la vue sélection
  - `closeModal()` : devient `async` ; ferme immédiatement la modale puis supprime silencieusement le chapitre non confirmé (`DELETE /chapters/{id}`) si `pendingChapterId` est non nul
  - Submit handler : remplace l'ancien `closeModal()` par `renderWordSelection(data.chapter.id, data.words)` après un `POST /chapters` réussi
  - `renderWordSelection(chapterId, words)` : affiche les mots sous forme de cartes à cocher (toutes cochées par défaut) avec les trois champs `word`, `base_form`, `output` ; message explicite si aucun mot ; bascule le titre de la modale vers "Mots extraits"
  - Handler "Retour" : supprime le chapitre non confirmé puis revient au formulaire
  - Handler "Confirmer la sélection" : lit les cases cochées par leur index dans `pendingWords`, bloque si sélection vide, appelle `POST /chapters/{id}/words`, affiche l'erreur inline en cas d'échec, ferme la modale et recharge la liste en cas de succès
- `book.css` — modifié : ajout des styles `.word-selection-hint`, `.word-selection-list` (scrollable, max-height 360 px), `.word-item__label` (carte cliquable avec hover), `.word-item__word/base/arrow/output`, effacement visuel (opacité 40 %) des cartes décochées via `:has()`

---

## Masquage du bouton Annuler / Enregistrer pendant la vue sélection

- `book.html` — modifié : ajout de `id="modal-actions"` sur la `<div class="modal__actions">` du formulaire pour permettre son contrôle via JS
- `book.js` — modifié : ajout du sélecteur `modalActionsEl` ; `renderWordSelection` passe `modalActionsEl.hidden = true` pour masquer les boutons Annuler/Enregistrer pendant la vue mots extraits ; `backToFormBtn` et `closeModal` passent `modalActionsEl.hidden = false` pour les restaurer

---

## Correctifs JS (3 points)

- `book.js` — modifié : validation `chapterNumber` renforcée avec `isNaN(chapterNumber)` explicite en plus du test falsy
- `book.js` — modifié : `res.json().catch(() => ({}))` appliqué sur le `POST /chapters` (robustesse si la réponse d'erreur n'est pas du JSON valide)
- `book.js` — vérifié : `closeModal()` gère déjà `pendingChapterId !== null` et appelle `DELETE /chapters/{id}` silencieusement (comportement identique au bouton Retour)

---

## Correction CSS — attribut `[hidden]` écrasé par `.modal__form`

Cause racine : `.modal__form { display: flex }` dans `dashboard.css` (ligne 282) avait une spécificité suffisante pour court-circuiter la règle navigateur de l'attribut `hidden`. Le formulaire restait visible même quand `addChapterForm.hidden = true` était positionné par `renderWordSelection`.

- `style.css` — modifié : ajout de `[hidden] { display: none !important; }` en règle globale (ligne 27), garantissant que l'attribut `hidden` est toujours respecté quelle que soit la règle `display` définie par les classes CSS auteur

---

## Commit

`1c1a613` — feat: extraction vocabulaire Gemini + sélection mots en modale deux vues



## commit: 