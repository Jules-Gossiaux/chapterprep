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

// Nouveaux champs du formulaire
const chapterNumberInput = document.getElementById("chapter-number");
const levelSelect        = document.getElementById("chapter-level");
const translationSelect  = document.getElementById("translation-mode");

// Vue sélection des mots
const modalTitleEl        = document.getElementById("modal-title");
const wordSelectionView   = document.getElementById("word-selection-view");
const wordListEl          = document.getElementById("word-list");
const wordSelectionHint   = document.getElementById("word-selection-hint");
const wordSelectionError  = document.getElementById("word-selection-error");
const confirmSelectionBtn = document.getElementById("confirm-selection-btn");
const backToFormBtn       = document.getElementById("back-to-form-btn");

navUsername.textContent = username;

// Id du chapitre créé par POST /books/{bookId}/chapters, non encore confirmé (null si aucun)
let pendingChapterId = null;
// Mots suggérés par Gemini, mémorisés pour la confirmation
let pendingWords     = [];

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
    wordsSlider.value          = rec;
    extractCurrent.textContent = rec;
  }
}

wordsSlider.addEventListener("input", () => {
  wordsSlider.dataset.touched    = "1";
  extractCurrent.textContent     = wordsSlider.value;
});

// ─────────────────────────────────────────────
//  Nettoyage du chapitre non confirmé
// ─────────────────────────────────────────────
async function cancelPendingChapter() {
  if (pendingChapterId !== null) {
    const id     = pendingChapterId;
    pendingChapterId = null;
    pendingWords     = [];
    try {
      await authFetch(`${API_URL}/books/${bookId}/chapters/${id}`, { method: "DELETE" });
    } catch { /* ignore */ }
  }
}

// ─────────────────────────────────────────────
//  Modale
// ─────────────────────────────────────────────
function openModal() {
  addChapterForm.reset();
  addChapterError.textContent = "";
  wordStatsEl.hidden          = true;
  extractGroup.hidden         = true;
  delete wordsSlider.dataset.touched;
  addChapterForm.hidden       = false;
  wordSelectionView.hidden    = true;
  modalTitleEl.textContent    = "Nouveau chapitre";
  modalOverlay.hidden         = false;
  chapterNumberInput.focus();
}

function closeModal() {
  // Ferme immédiatement — nettoyage en arrière-plan intentionnel (pas de await)
  modalOverlay.hidden      = true;
  addChapterForm.hidden    = false;
  wordSelectionView.hidden = true;
  modalTitleEl.textContent = "Nouveau chapitre";
  cancelPendingChapter();
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
  li.className  = "chapter-card";
  li.dataset.id = chapter.id;

  const modeLabel = chapter.translation_mode === "definition" ? "Définition" : "Traduction";

  li.innerHTML = `
    <div class="chapter-card__index">${index}</div>
    <div class="chapter-card__body">
      <p class="chapter-card__title">Chapitre ${chapter.chapter_number}</p>
      <div class="chapter-card__meta">
        <span class="chapter-card__stat">Niveau <strong>${escapeHtml(chapter.level)}</strong></span>
        <span class="chapter-card__stat">${modeLabel}</span>
      </div>
    </div>
    <button class="chapter-card__delete" aria-label="Supprimer ce chapitre" title="Supprimer">🗑</button>
  `;

  li.querySelector(".chapter-card__delete").addEventListener("click", () =>
    deleteChapter(chapter.id, chapter.chapter_number, li)
  );

  li.querySelector(".chapter-card__body").addEventListener("click", () => {
    window.location.href = `read.html?id=${chapter.id}&book_id=${bookId}`;
  });

  return li;
}

function renderChapterList(chapters) {
  chapterList.innerHTML = "";
  if (chapters.length === 0) {
    emptyState.hidden  = false;
    chapterList.hidden = true;
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
    document.title           = `ChapterPrep — ${book.title}`;
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

  const chapterNumber   = parseInt(chapterNumberInput.value, 10);
  const level           = levelSelect.value;
  const translationMode = translationSelect.value;
  const text            = contentTextarea.value.trim();
  const wordsToExtract  = parseInt(wordsSlider.value, 10);

  if (!chapterNumber || isNaN(chapterNumber) || chapterNumber < 1) { addChapterError.textContent = "Le numéro de chapitre est obligatoire."; return; }
  if (!text) { addChapterError.textContent = "Le contenu est obligatoire."; return; }

  setLoading(addChapterSubmit, "Extraction en cours…");

  try {
    const res = await authFetch(`${API_URL}/books/${bookId}/chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapter_number:   chapterNumber,
        text,
        words_to_extract: wordsToExtract,
        level,
        translation_mode: translationMode,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) { addChapterError.textContent = data.detail || "Erreur lors de l'enregistrement."; return; }

    renderWordSelection(data.chapter.id, data.words);
  } catch (err) {
    if (err.message !== "Unauthorized") {
      addChapterError.textContent = "Impossible de contacter le serveur.";
    }
  } finally {
    resetBtn(addChapterSubmit, "Enregistrer");
  }
});

// ─────────────────────────────────────────────
//  Sélection des mots extraits
// ─────────────────────────────────────────────
function renderWordSelection(chapterId, words) {
  pendingChapterId               = chapterId;
  pendingWords                   = Array.isArray(words) ? words : [];
  wordSelectionError.textContent = "";
  wordListEl.innerHTML           = "";

  if (pendingWords.length === 0) {
    wordSelectionHint.textContent = "";
    const li = document.createElement("li");
    li.className   = "word-item word-item--empty";
    li.textContent = "Gemini n'a retourné aucun mot.";
    wordListEl.appendChild(li);
  } else {
    const n = pendingWords.length;
    wordSelectionHint.textContent =
      `${n} mot${n > 1 ? "s" : ""} suggéré${n > 1 ? "s" : ""} — décochez ceux que vous ne souhaitez pas retenir.`;
    pendingWords.forEach((w, i) => {
      const li         = document.createElement("li");
      li.className     = "word-item";
      li.dataset.index = i;
      const cbId       = `word-cb-${i}`;
      li.innerHTML = `
        <label class="word-item__label" for="${cbId}">
          <input type="checkbox" id="${cbId}" class="word-item__checkbox" checked />
          <span class="word-item__word">${escapeHtml(w.word)}</span>
          <span class="word-item__base">(${escapeHtml(w.base_form)})</span>
          <span class="word-item__arrow">→</span>
          <span class="word-item__output">${escapeHtml(w.output)}</span>
        </label>
      `;
      wordListEl.appendChild(li);
    });
  }

  addChapterForm.hidden    = true;
  wordSelectionView.hidden = false;
  modalTitleEl.textContent = "Mots extraits";
}

backToFormBtn.addEventListener("click", async () => {
  await cancelPendingChapter(); // await ici — l'user reste dans la modale
  wordSelectionView.hidden = true;
  addChapterForm.hidden    = false;
  modalTitleEl.textContent = "Nouveau chapitre";
});

confirmSelectionBtn.addEventListener("click", async () => {
  wordSelectionError.textContent = "";

  const selectedIndices = Array.from(
    wordListEl.querySelectorAll(".word-item__checkbox:checked")
  ).map((cb) => parseInt(cb.closest(".word-item").dataset.index, 10));

  if (selectedIndices.length === 0) {
    wordSelectionError.textContent = "Veuillez sélectionner au moins un mot.";
    return;
  }

  const selectedWords = selectedIndices.map((i) => pendingWords[i]);

  setLoading(confirmSelectionBtn, "Enregistrement…");

  try {
    const res = await authFetch(`${API_URL}/books/${bookId}/chapters/${pendingChapterId}/words`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words: selectedWords }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      wordSelectionError.textContent = data.detail || "Erreur lors de l'enregistrement.";
      return;
    }

    pendingChapterId = null;
    pendingWords     = [];
    closeModal();
    await loadChapters();
  } catch (err) {
    if (err.message !== "Unauthorized") {
      wordSelectionError.textContent = "Impossible de contacter le serveur.";
    }
  } finally {
    resetBtn(confirmSelectionBtn, "Confirmer la sélection");
  }
});

// ─────────────────────────────────────────────
//  Suppression d'un chapitre
// ─────────────────────────────────────────────
async function deleteChapter(chapterId, chapterNumber, cardEl) {
  if (!confirm(`Supprimer le chapitre ${chapterNumber} ? Cette action est irréversible.`)) return;

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
    document.querySelectorAll(".chapter-card__index").forEach((el, i) => {
      el.textContent = i + 1;
    });
    if (chapterList.children.length === 0) {
      chapterList.hidden = true;
      emptyState.hidden  = false;
    }
  } catch (err) {
    if (err.message !== "Unauthorized") {
      alert("Impossible de contacter le serveur.");
      cardEl.classList.remove("chapter-card--deleting");
    }
  }
}

// ─────────────────────────────────────────────
//  Initialisation
// ─────────────────────────────────────────────
async function init() {
  await loadBook();
  await loadChapters();
}

init();