# Architecture — ChapterPrep

## Vue d'ensemble

ChapterPrep est une application web découplée :

- **Frontend** — HTML / CSS / JS vanilla, servi statiquement (GitHub Pages en prod)
- **Backend** — API REST FastAPI (Python), hébergée sur Render en prod

Les deux communiquent exclusivement via HTTP/JSON. L'authentification repose sur des tokens JWT transmis dans le header `Authorization: Bearer <token>`.

---

## Structure des fichiers

```
chapter-prep-sans-ai/
│
├── index.html          → Page connexion / inscription
├── style.css           → Styles communs (variables, formulaires, boutons)
├── app.js              → Logique login / register
│
├── app.html            → Dashboard principal (livres)
├── dashboard.css       → Styles dashboard (navbar, cards, modale)
├── dashboard.js        → Logique dashboard (auth guard, CRUD livres)
│
├── book.html           → Page d'un livre (liste des chapitres)
├── book.css            → Styles page livre (chapter-card, word-stats, slider)
├── book.js             → Logique page livre (loadBook, loadChapters, CRUD chapitres)
│
├── docs/
│   ├── architecture.md → Ce fichier
│   └── historique.md   → Journal de toutes les modifications
│
└── backend/
    ├── main.py             → Point d'entrée FastAPI, CORS, inclusion des routers
    ├── config.py           → Variables d'environnement (.env)
    ├── database.py         → Connexion SQLite, init_db() (création des tables)
    ├── models.py           → Tous les schémas Pydantic (Request / Response)
    ├── dependencies.py     → get_current_user() injectable via Depends()
    │
    ├── routes/
    │   ├── auth.py         → POST /auth/register, POST /auth/login
    │   ├── books.py        → GET /books, GET /books/{id}, POST /books, DELETE /books/{id}
    │   └── chapters.py     → GET|POST /books/{id}/chapters, DELETE /books/{id}/chapters/{ch_id}
    │
    ├── services/
    │   ├── auth_service.py     → Hash, vérif mot de passe, JWT, register/login
    │   ├── book_service.py     → Logique métier livres
    │   └── chapter_service.py  → Logique métier chapitres (word_count, recommandation)
    │
    ├── repositories/
    │   ├── user_repository.py    → SQL utilisateurs (get, create)
    │   ├── book_repository.py    → SQL livres (get, create, delete)
    │   └── chapter_repository.py → SQL chapitres (get, create, delete)
    │
    ├── .env                → Secrets locaux (jamais commité)
    ├── .env.example        → Template sans valeurs sensibles
    ├── requirements.txt
    └── chapterprep.db      → Base SQLite locale (jamais commitée)
```

---

## Architecture en couches (backend)

```
Requête HTTP
     │
     ▼
 routes/          ← Reçoit, valide avec Pydantic, appelle le service, renvoie la réponse
     │
     ▼
 services/        ← Logique métier : règles, validations, orchestration
     │
     ▼
 repositories/    ← SQL uniquement, aucune logique métier
     │
     ▼
 SQLite (database.py)
```

**Règle absolue :** le SQL ne remonte jamais au-delà des repositories. La logique métier ne descend jamais dans les repositories.

---

## Base de données

### Schéma

```sql
users
  id          INTEGER  PK AUTOINCREMENT
  username    TEXT     NOT NULL UNIQUE
  email       TEXT     NOT NULL UNIQUE
  password    TEXT     NOT NULL          -- hash pbkdf2_sha256, jamais en clair
  created_at  TEXT     NOT NULL DEFAULT datetime('now')

books
  id          INTEGER  PK AUTOINCREMENT
  user_id     INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE
  title       TEXT     NOT NULL
  author      TEXT
  language    TEXT     NOT NULL DEFAULT 'fr'
  created_at  TEXT     NOT NULL DEFAULT datetime('now')

chapters
  id               INTEGER  PK AUTOINCREMENT
  user_id          INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE
  title            TEXT     NOT NULL   -- titre du livre (dénormalisé, pas de FK)
  chapter_number   INTEGER  NOT NULL
  text             TEXT     NOT NULL
  target_language  TEXT     NOT NULL
  level            TEXT     NOT NULL   -- A1 à C2
  translation_mode TEXT     NOT NULL   -- 'translation' | 'definition'
  words_to_extract INTEGER  NOT NULL DEFAULT 5
  created_at       TEXT     NOT NULL DEFAULT datetime('now')

words
  id          INTEGER  PK AUTOINCREMENT
  chapter_id  INTEGER  NOT NULL REFERENCES chapters(id) ON DELETE CASCADE
  word        TEXT     NOT NULL   -- forme dans le texte
  base_form   TEXT     NOT NULL   -- forme de base / lemme
  output      TEXT     NOT NULL   -- traduction ou définition
  created_at  TEXT     NOT NULL DEFAULT datetime('now')
```

### Contraintes clés
- `PRAGMA foreign_keys = ON` activé sur chaque connexion
- Les emails sont normalisés en minuscules avant insertion (`.lower()` dans le validator Pydantic)
- Toutes les requêtes utilisent des paramètres positionnels (`?`) — zéro concaténation de chaînes

---

## Authentification

1. **Inscription** (`POST /auth/register`) → mot de passe haché avec `pbkdf2_sha256`, stocké en base
2. **Connexion** (`POST /auth/login`) → JWT signé avec `HS256`, durée configurable (`ACCESS_TOKEN_EXPIRE_MINUTES`)
3. **Routes protégées** → `Depends(get_current_user)` dans `dependencies.py` extrait et vérifie le token, retourne un `TokenData(user_id, username)`
4. **Côté frontend** → token stocké dans `localStorage`, envoyé dans chaque requête via `Authorization: Bearer <token>`

---

## Flux utilisateur

```
index.html
  │
  ├── Inscription → POST /auth/register → retour 201 + données user
  │
  └── Connexion   → POST /auth/login    → retour token JWT
                          │
                          ▼
                    localStorage:
                      token, username, user_id
                          │
                          ▼
                     app.html (dashboard)
                       │
                       ├── GET /books         → liste des livres de l'user
                       ├── POST /books        → créer un livre
                       ├── DELETE /books/{id} → supprimer un livre
                       │
                       └── book.html (chapitres d'un livre)
                             │
                             ├── GET /books/{id}          → métadonnées du livre
                             ├── GET /chapters            → tous les chapitres user
                             │                              (filtré par titre côté client)
                             ├── POST /chapters           → crée le chapitre + appelle
                             │                              Gemini → retourne { chapter, words }
                             ├── DELETE /chapters/{id}    → supprimer un chapitre
                             ├── POST /chapters/{id}/words → confirmer la sélection de mots
                             └── GET  /chapters/{id}/words → lire les mots stockés
```

---

## Sécurité

| Point | Implémentation |
|---|---|
| Secrets | Variables d'environnement via `python-dotenv`, jamais dans le code |
| Mots de passe | `pbkdf2_sha256.hash()`, vérification avec `pbkdf2_sha256.verify()` |
| Tokens | JWT HS256, expiration configurable, validé à chaque requête protégée |
| Isolation des données | Chaque requête filtre par `user_id` extrait du token (pas du body) |
| Inputs | Validés côté backend par Pydantic (`field_validator`) indépendamment du frontend |
| CORS | `allow_origins=["*"]` en dev ; à restreindre au domaine GitHub Pages en prod |
| `.gitignore` | `.env` et `chapterprep.db` exclus du dépôt |

---

## Variables d'environnement

| Variable | Description | Défaut dev |
|---|---|---|
| `SECRET_KEY` | Clé de signature JWT (32+ chars hex) | `dev_secret_change_me` |
| `ALGORITHM` | Algorithme JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée de vie du token | `60` |
| `DATABASE_URL` | Chemin vers la base SQLite | `./chapterprep.db` |
| `APP_ENV` | Environnement (`production` déclenche des guards) | _(vide)_ |
| `GEMINI_API_KEY` | Clé API Google Gemini (extraction vocabulaire) | _(obligatoire)_ |

---

## Déploiement (cible)

| Partie | Service |
|---|---|
| Frontend | GitHub Pages (fichiers statiques à la racine) |
| Backend | Render — Web Service (Python) |
| Base de données | SQLite en dev → PostgreSQL (Render) en prod |

En production, `API_URL` dans `dashboard.js` et `app.js` devra pointer vers l'URL Render.
