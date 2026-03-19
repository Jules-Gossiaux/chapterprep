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
const booksError        = document.getElementById("books-error");
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
    <div class="book-card__body">
      <p class="book-card__title">${escapeHtml(book.title)}</p>
      <p class="book-card__author">${escapeHtml(book.author || "Auteur inconnu")}</p>
      <span class="book-card__badge">${langLabel(book.language)}</span>
    </div>
    <button class="book-card__delete" aria-label="Supprimer ce livre" title="Supprimer">🗑</button>
  `;

  li.querySelector(".book-card__body").addEventListener("click", () => {
    window.location.href = `book.html?id=${book.id}`;
  });

  li.querySelector(".book-card__delete").addEventListener("click", () =>
    deleteBook(book.id, book.title, li)
  );

  return li;
}

async function deleteBook(bookId, bookTitle, cardEl) {
  if (!confirm(`Supprimer "${bookTitle}" ? Cette action est irréversible.`)) return;

  cardEl.classList.add("book-card--deleting");

  try {
    const response = await fetch(`${API_URL}/books/${bookId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      localStorage.clear();
      window.location.href = "index.html";
      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert(data.detail || "Erreur lors de la suppression.");
      cardEl.classList.remove("book-card--deleting");
      return;
    }

    // Suppression visuelle sans recharger toute la liste
    cardEl.remove();
    if (bookGrid.children.length === 0) {
      bookGrid.hidden   = true;
      emptyState.hidden = false;
    }
  } catch (err) {
    alert("Impossible de contacter le serveur.");
    cardEl.classList.remove("book-card--deleting");
    console.error(err);
  }
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
      booksError.textContent = `Erreur serveur (${response.status}) — impossible de charger les livres.`;
      booksError.hidden = false;
      renderBookList([]);
      return;
    }

    booksError.hidden = true;
    const books = await response.json();
    renderBookList(Array.isArray(books) ? books : []);
  } catch (err) {
    console.error("Impossible de charger les livres :", err);
    booksError.textContent = "Impossible de contacter le serveur.";
    booksError.hidden = false;
    renderBookList([]);
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

// ─────────────────────────────────────────────
//  Import PDF
// ─────────────────────────────────────────────
const importBtn = document.getElementById('import-book-btn');
const modalImport = document.getElementById('modal-import-overlay');
const btnCloseImport = document.getElementById('modal-import-close');
const btnCancelImport = document.getElementById('modal-import-cancel-btn');
const formImport = document.getElementById('import-book-form');
const submitImportBtn = document.getElementById('import-submit-btn');
const errorImport = document.getElementById('import-error');
const dropzone = document.getElementById('pdf-dropzone');
const pdfInput = document.getElementById('pdf-file-input');
const wordsSlider = document.getElementById('import-words-slider');
const wordsVal = document.getElementById('import-words-val');
const previewBox = document.getElementById('import-preview-box');
const previewCount = document.getElementById('import-chapter-count');
const dropzoneBtn = document.getElementById('dropzone-btn');

let extractedChapters = [];

importBtn.addEventListener('click', () => { 
  formImport.reset(); 
  errorImport.textContent = ''; 
  previewBox.hidden = true; 
  submitImportBtn.hidden = true; 
  dropzone.classList.remove('dropzone--disabled'); 
  dropzone.querySelector('.dropzone__text').innerHTML = 'Glissez-déposez le PDF ici<br>ou cliquez pour choisir';
  wordsSlider.disabled = false; 
  wordsVal.textContent = wordsSlider.value; 
  extractedChapters = []; 
  modalImport.hidden = false; 
});

const closeImportModal = () => { modalImport.hidden = true; };
btnCloseImport.addEventListener('click', closeImportModal);
btnCancelImport.addEventListener('click', closeImportModal);
modalImport.addEventListener('click', e => { if (e.target === modalImport) closeImportModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modalImport.hidden) closeImportModal(); });

wordsSlider.addEventListener('input', e => { wordsVal.textContent = e.target.value; });

// Gestion Dropzone
dropzoneBtn.addEventListener('click', () => pdfInput.click());
dropzone.addEventListener('click', (e) => { if (e.target !== dropzoneBtn) pdfInput.click(); });
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', e => { 
  e.preventDefault(); 
  dropzone.classList.remove('dragover'); 
  const file = e.dataTransfer.files[0]; 
  if (file) handleFile(file); 
});
pdfInput.addEventListener('change', e => { 
  const file = e.target.files[0]; 
  if (file) handleFile(file); 
});

async function handleFile(file) { 
  if (!file.name.toLowerCase().endsWith('.pdf')) { 
    errorImport.textContent = 'Veuillez sélectionner un fichier PDF.'; 
    return; 
  } 
  errorImport.textContent = ''; 
  dropzone.classList.add('dropzone--disabled'); 
  wordsSlider.disabled = true; 
  dropzone.querySelector('.dropzone__text').innerHTML = '<span class="spinner"></span><br>Découpage en cours...'; 
  
  const formData = new FormData(); 
  formData.append('file', file); 
  formData.append('words_per_chapter', wordsSlider.value); 
  
  try { 
    const res = await fetch(`${API_URL}/utils/pdf/preview`, { 
      method: 'POST', 
      headers: { Authorization: `Bearer ${token}` }, 
      body: formData 
    }); 
    const data = await res.json(); 
    if (!res.ok) throw new Error(data.detail || 'Erreur lors du découpage.'); 
    
    extractedChapters = data.chapters; 
    previewCount.textContent = data.chapter_count; 
    previewBox.hidden = false; 
    submitImportBtn.hidden = false; 
    dropzone.querySelector('.dropzone__text').innerHTML = 'Document prêt.'; 
  } catch(e) { 
    errorImport.textContent = e.message; 
    dropzone.classList.remove('dropzone--disabled'); 
    wordsSlider.disabled = false; 
    dropzone.querySelector('.dropzone__text').innerHTML = 'Glissez-déposez le PDF ici<br>ou cliquez pour choisir'; 
  } 
}

formImport.addEventListener('submit', async e => { 
  e.preventDefault(); 
  if(extractedChapters.length === 0) return; 
  
  setLoading(submitImportBtn, 'Sauvegarde...'); 
  errorImport.textContent = ''; 
  const title = document.getElementById('import-title').value.trim(); 
  const author = document.getElementById('import-author').value.trim(); 
  const language = document.getElementById('import-language').value; 
  
  try { 
    const res = await fetch(`${API_URL}/books/batch-import`, { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${token}` 
      }, 
      body: JSON.stringify({ title, author, language, chapters: extractedChapters }) 
    }); 
    const data = await res.json(); 
    if(!res.ok) throw new Error(data.detail || 'Erreur sauvegarde.'); 
    
    window.location.href = `book.html?id=${data.id}`; 
  } catch(e) { 
    errorImport.textContent = e.message; 
    resetBtn(submitImportBtn, 'Sauvegarder'); 
  } 
});
