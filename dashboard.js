// ─────────────────────────────────────────────
//  Configuration
// ─────────────────────────────────────────────
const API_URL = "http://localhost:8000";

// ─────────────────────────────────────────────
//  Garde d'authentification
//  → redirige vers index.html si pas de token
// ─────────────────────────────────────────────
const token    = localStorage.getItem("token");
const username = localStorage.getItem("username");
const userId   = localStorage.getItem("user_id");

if (!token || !username) {
  window.location.href = "index.html";
}

// ─────────────────────────────────────────────
//  Sélecteurs
// ─────────────────────────────────────────────
const navUsername       = document.getElementById("nav-username");
const welcomeUsername   = document.getElementById("welcome-username");
const logoutBtn         = document.getElementById("logout-btn");
const addBookBtn        = document.getElementById("add-book-btn");
const addBookEmptyBtn   = document.getElementById("add-book-empty-btn");
const modalOverlay      = document.getElementById("modal-overlay");
const modalClose        = document.getElementById("modal-close");
const modalCancelBtn    = document.getElementById("modal-cancel-btn");
const addBookForm       = document.getElementById("add-book-form");
const addBookError      = document.getElementById("add-book-error");
const addBookSubmitBtn  = document.getElementById("add-book-submit-btn");
const emptyState        = document.getElementById("empty-state");
const bookGrid          = document.getElementById("book-grid");

// ─────────────────────────────────────────────
//  Affichage du nom d'utilisateur
// ─────────────────────────────────────────────
navUsername.textContent   = username;
welcomeUsername.textContent = username;

// ─────────────────────────────────────────────
//  Logout
// ─────────────────────────────────────────────
logoutBtn.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

// ─────────────────────────────────────────────
//  Helpers UI
// ─────────────────────────────────────────────
function openModal() {
  addBookForm.reset();
  addBookError.textContent = "";
  modalOverlay.hidden = false;
}

function closeModal() {
  modalOverlay.hidden = true;
}

function setLoading(btn, label) {
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${label}`;
}

function resetBtn(btn, label) {
  btn.disabled = false;
  btn.textContent = label;
}

// ─────────────────────────────────────────────
//  Ouverture / fermeture de la modale
// ─────────────────────────────────────────────
addBookBtn.addEventListener("click", openModal);
addBookEmptyBtn.addEventListener("click", openModal);
modalClose.addEventListener("click", closeModal);
modalCancelBtn.addEventListener("click", closeModal);

// Fermer en cliquant sur l'overlay (hors de la modale)
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Fermer avec Échap
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalOverlay.hidden) closeModal();
});

// ─────────────────────────────────────────────
//  Rendu d'une carte livre
// ─────────────────────────────────────────────
function renderBook(book) {
  const li = document.createElement("li");
  li.className = "book-card";
  li.dataset.id = book.id;
  li.innerHTML = `
    <p class="book-card__title">${escapeHtml(book.title)}</p>
    <p class="book-card__author">${escapeHtml(book.author || "Auteur inconnu")}</p>
    <span class="book-card__badge">${langLabel(book.language)}</span>
  `;
  li.addEventListener("click", () => {
    // TODO : ouvrir la page de vocabulaire du livre
    alert(`📖 Vocabulaire de "${book.title}" — bientôt disponible !`);
  });
  return li;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function langLabel(code) {
  return { fr: "Français", en: "Anglais", es: "Espagnol", de: "Allemand", it: "Italien" }[code] ?? code;
}

// ─────────────────────────────────────────────
//  Mettre à jour l'affichage de la grille
// ─────────────────────────────────────────────
function renderBookList(books) {
  bookGrid.innerHTML = "";

  if (books.length === 0) {
    emptyState.hidden = false;
    bookGrid.hidden   = true;
    return;
  }

  emptyState.hidden = true;
  bookGrid.hidden   = false;
  books.forEach((book) => bookGrid.appendChild(renderBook(book)));
}

// ─────────────────────────────────────────────
//  Charger les livres depuis l'API
// ─────────────────────────────────────────────
async function loadBooks() {
  try {
    const response = await fetch(`${API_URL}/books`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      localStorage.clear();
      window.location.href = "index.html";
      return;
    }

    if (!response.ok) {
      // Route pas encore créée ou autre erreur serveur → état vide
      renderBookList([]);
      return;
    }

    const books = await response.json();
    renderBookList(Array.isArray(books) ? books : []);
  } catch (err) {
    console.error("Impossible de charger les livres :", err);
    renderBookList([]); // affiche l'état vide plutôt qu'un écran blanc
  }
}

// ─────────────────────────────────────────────
//  Ajouter un livre
// ─────────────────────────────────────────────
addBookForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  addBookError.textContent = "";

  const title    = document.getElementById("book-title").value.trim();
  const author   = document.getElementById("book-author").value.trim();
  const language = document.getElementById("book-language").value;

  if (!title) {
    addBookError.textContent = "Le titre est obligatoire.";
    return;
  }

  setLoading(addBookSubmitBtn, "Création…");

  try {
    const response = await fetch(`${API_URL}/books`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ title, author, language }),
    });

    const data = await response.json();

    if (!response.ok) {
      addBookError.textContent = data.detail || "Erreur lors de la création.";
      return;
    }

    closeModal();
    await loadBooks(); // recharge la liste
  } catch (err) {
    addBookError.textContent = "Impossible de contacter le serveur.";
    console.error(err);
  } finally {
    resetBtn(addBookSubmitBtn, "Créer");
  }
});

// ─────────────────────────────────────────────
//  Initialisation
// ─────────────────────────────────────────────
loadBooks();
