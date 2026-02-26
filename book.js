// ─────────────────────────────────────────────
//  Configuration
// ─────────────────────────────────────────────
const API_URL = "http://localhost:8000";

// ─────────────────────────────────────────────
//  Auth guard
// ─────────────────────────────────────────────
const token    = localStorage.getItem("token");
const username = localStorage.getItem("username");

if (!token || !username) {
  window.location.href = "index.html";
}

// ─────────────────────────────────────────────
//  Récupération de l'id du livre depuis l'URL
// ─────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const bookId = parseInt(params.get("id"), 10);

if (!bookId) {
  window.location.href = "app.html";
}

// ─────────────────────────────────────────────
//  Sélecteurs
// ─────────────────────────────────────────────
const navUsername        = document.getElementById("nav-username");
const logoutBtn          = document.getElementById("logout-btn");
const bookTitleEl        = document.getElementById("book-title");
const bookAuthorEl       = document.getElementById("book-author");
const emptyState         = document.getElementById("empty-state");
const chapterList        = document.getElementById("chapter-list");
const addChapterBtn      = document.getElementById("add-chapter-btn");
const addChapterEmptyBtn = document.getElementById("add-chapter-empty-btn");
const modalOverlay       = document.getElementById("modal-overlay");
const modalClose         = document.getElementById("modal-close");
const modalCancelBtn     = document.getElementById("modal-cancel-btn");
const addChapterForm     = document.getElementById("add-chapter-form");
const addChapterError    = document.getElementById("add-chapter-error");
const addChapterSubmit   = document.getElementById("add-chapter-submit-btn");
const contentTextarea    = document.getElementById("chapter-content");
const wordCountEl        = document.getElementById("word-count");
const recValueEl         = document.getElementById("rec-value");
const wordStatsEl        = document.getElementById("word-stats");
const extractGroup       = document.getElementById("extract-group");
const wordsSlider        = document.getElementById("words-to-extract");
const extractCurrent     = document.getElementById("extract-current");

navUsername.textContent = username;

// ─────────────────────────────────────────────
//  Logout
// ─────────────────────────────────────────────
logoutBtn.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function countWords(text) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

function recommendWords(wordCount) {
  return Math.max(5, Math.min(Math.round(wordCount * 0.05), 60));
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function setLoading(btn, label) {
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${label}`;
}

function resetBtn(btn, label) {
  btn.disabled = false;
  btn.textContent = label;
}

async function authFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = "index.html";
    throw new Error("Unauthorized");
  }
  return res;
}

// ─────────────────────────────────────────────
//  Compteur de mots live sur le textarea
// ─────────────────────────────────────────────
contentTextarea.addEventListener("input", updateWordStats);

function updateWordStats() {
  const wc  = countWords(contentTextarea.value);
  const rec = recommendWords(wc);

  if (wc === 0) {
    wordStatsEl.hidden  = true;
    extractGroup.hidden = true;
    return;
  }

  wordStatsEl.hidden  = false;
  extractGroup.hidden = false;

  wordCountEl.textContent  = wc.toLocaleString("fr-FR");
  recValueEl.textContent   = rec;

  // Met à jour le slider sur la valeur recommandée seulement si l'user n'a pas encore bougé
  if (!wordsSlider.dataset.touched) {
    wordsSlider.value       = rec;
    extractCurrent.textContent = rec;
  }
}

wordsSlider.addEventListener("input", () => {
  wordsSlider.dataset.touched    = "1";
  extractCurrent.textContent     = wordsSlider.value;
});

// ─────────────────────────────────────────────
//  Modale
// ─────────────────────────────────────────────
function openModal() {
  addChapterForm.reset();
  addChapterError.textContent = "";
  wordStatsEl.hidden          = true;
  extractGroup.hidden         = true;
  delete wordsSlider.dataset.touched;
  modalOverlay.hidden = false;
  document.getElementById("chapter-title").focus();
}

function closeModal() {
  modalOverlay.hidden = true;
}

addChapterBtn.addEventListener("click", openModal);
addChapterEmptyBtn.addEventListener("click", openModal);
modalClose.addEventListener("click", closeModal);
modalCancelBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modalOverlay.hidden) closeModal(); });

// ─────────────────────────────────────────────
//  Rendu d'une carte chapitre
// ─────────────────────────────────────────────
function renderChapter(chapter, index) {
  const li = document.createElement("li");
  li.className = "chapter-card";
  li.dataset.id = chapter.id;
  li.innerHTML = `
    <div class="chapter-card__index">${index}</div>
    <div class="chapter-card__body">
      <p class="chapter-card__title">${escapeHtml(chapter.title)}</p>
      <div class="chapter-card__meta">
        <span class="chapter-card__stat"><strong>${chapter.word_count.toLocaleString("fr-FR")}</strong> mots</span>
        <span class="chapter-card__stat"><strong>${chapter.words_to_extract}</strong> mots à extraire</span>
      </div>
    </div>
    <button class="chapter-card__delete" aria-label="Supprimer ce chapitre" title="Supprimer">🗑</button>
  `;

  li.querySelector(".chapter-card__delete").addEventListener("click", () =>
    deleteChapter(chapter.id, chapter.title, li)
  );

  return li;
}

function renderChapterList(chapters) {
  chapterList.innerHTML = "";
  if (chapters.length === 0) {
    emptyState.hidden   = false;
    chapterList.hidden  = true;
    return;
  }
  emptyState.hidden  = true;
  chapterList.hidden = false;
  chapters.forEach((ch, i) => chapterList.appendChild(renderChapter(ch, i + 1)));
}

// ─────────────────────────────────────────────
//  Chargement des données
// ─────────────────────────────────────────────
async function loadBook() {
  try {
    const res = await authFetch(`${API_URL}/books/${bookId}`);
    if (!res.ok) { window.location.href = "app.html"; return; }
    const book = await res.json();
    bookTitleEl.textContent  = book.title;
    bookAuthorEl.textContent = book.author || "";
    document.title = `ChapterPrep — ${book.title}`;
  } catch {
    window.location.href = "app.html";
  }
}

async function loadChapters() {
  try {
    const res = await authFetch(`${API_URL}/books/${bookId}/chapters`);
    if (!res.ok) { renderChapterList([]); return; }
    const chapters = await res.json();
    renderChapterList(Array.isArray(chapters) ? chapters : []);
  } catch {
    renderChapterList([]);
  }
}

// ─────────────────────────────────────────────
//  Ajout d'un chapitre
// ─────────────────────────────────────────────
addChapterForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  addChapterError.textContent = "";

  const title   = document.getElementById("chapter-title").value.trim();
  const content = contentTextarea.value.trim();
  const wordsToExtract = parseInt(wordsSlider.value, 10);

  if (!title)   { addChapterError.textContent = "Le titre est obligatoire."; return; }
  if (!content) { addChapterError.textContent = "Le contenu est obligatoire."; return; }

  setLoading(addChapterSubmit, "Enregistrement…");

  try {
    const res = await authFetch(`${API_URL}/books/${bookId}/chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, words_to_extract: wordsToExtract }),
    });

    const data = await res.json();
    if (!res.ok) { addChapterError.textContent = data.detail || "Erreur lors de l'enregistrement."; return; }

    closeModal();
    await loadChapters();
  } catch {
    addChapterError.textContent = "Impossible de contacter le serveur.";
  } finally {
    resetBtn(addChapterSubmit, "Enregistrer");
  }
});

// ─────────────────────────────────────────────
//  Suppression d'un chapitre
// ─────────────────────────────────────────────
async function deleteChapter(chapterId, chapterTitle, cardEl) {
  if (!confirm(`Supprimer "${chapterTitle}" ? Cette action est irréversible.`)) return;

  cardEl.classList.add("chapter-card--deleting");

  try {
    const res = await authFetch(`${API_URL}/books/${bookId}/chapters/${chapterId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.detail || "Erreur lors de la suppression.");
      cardEl.classList.remove("chapter-card--deleting");
      return;
    }

    cardEl.remove();
    // Recalcule les numéros
    document.querySelectorAll(".chapter-card__index").forEach((el, i) => {
      el.textContent = i + 1;
    });
    if (chapterList.children.length === 0) {
      chapterList.hidden  = true;
      emptyState.hidden   = false;
    }
  } catch {
    alert("Impossible de contacter le serveur.");
    cardEl.classList.remove("chapter-card--deleting");
  }
}

// ─────────────────────────────────────────────
//  Initialisation
// ─────────────────────────────────────────────
loadBook();
loadChapters();
