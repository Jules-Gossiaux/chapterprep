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
const chapterContentError = document.getElementById("chapter-content-error");
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
const chapterNumberGroup = document.getElementById("chapter-number-group");
const chapterContentGroup = document.getElementById("chapter-content-group");

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
let modalMode = "create";
let shouldDeletePendingChapter = true;
let extractionTargetWords = 5;

const MAX_CHAPTER_WORDS = 2000;

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

function enforceWordLimit(text, limit) {
  const words = [...text.matchAll(/\S+/g)];
  const total = words.length;
  if (total <= limit) {
    return { text, total, truncated: false, dropped: 0 };
  }

  const lastKept = words[limit - 1];
  const endIndex = lastKept.index + lastKept[0].length;
  return {
    text: text.slice(0, endIndex),
    total,
    truncated: true,
    dropped: total - limit,
  };
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
contentTextarea.addEventListener("beforeinput", (e) => {
  if (modalMode !== "create") return;
  if (!e.inputType || !e.inputType.startsWith("insert")) return;

  const hasSelection = contentTextarea.selectionStart !== contentTextarea.selectionEnd;
  const currentWords = countWords(contentTextarea.value);
  if (currentWords >= MAX_CHAPTER_WORDS && !hasSelection) {
    e.preventDefault();
    chapterContentError.textContent = `Limite atteinte : ${MAX_CHAPTER_WORDS} mots maximum.`;
    addChapterSubmit.disabled = true;
  }
});

function updateWordStats() {
  let wc = countWords(contentTextarea.value);

  if (modalMode === "create") {
    const limited = enforceWordLimit(contentTextarea.value, MAX_CHAPTER_WORDS);
    if (limited.truncated) {
      contentTextarea.value = limited.text;
      wc = MAX_CHAPTER_WORDS;
      chapterContentError.textContent = `Texte tronqué à ${MAX_CHAPTER_WORDS} mots (${limited.dropped} mots ignorés).`;
      addChapterSubmit.disabled = false;
    } else if (wc >= MAX_CHAPTER_WORDS) {
      chapterContentError.textContent = `Limite atteinte : ${MAX_CHAPTER_WORDS} mots maximum.`;
      addChapterSubmit.disabled = false;
    } else {
      chapterContentError.textContent = "";
      addChapterSubmit.disabled = false;
    }
  }

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
  modalMode = "create";
  shouldDeletePendingChapter = true;
  extractionTargetWords = parseInt(wordsSlider.value, 10) || 5;
  addChapterForm.reset();
  addChapterError.textContent = "";
  chapterContentError.textContent = "";
  addChapterSubmit.disabled = false;
  wordStatsEl.hidden          = true;
  extractGroup.hidden         = true;
  chapterNumberGroup.hidden   = false;
  chapterContentGroup.hidden  = false;
  delete wordsSlider.dataset.touched;
  addChapterForm.hidden       = false;
  wordSelectionView.hidden    = true;
  modalTitleEl.textContent    = "Nouveau chapitre";
  modalOverlay.hidden = false;
  chapterNumberInput.focus();
}

function openExtractModal(chapter) {
  modalMode = "extract-existing";
  shouldDeletePendingChapter = false;
  pendingChapterId = chapter.id;
  pendingWords = [];

  const chapterText = String(chapter.text || "");
  extractionTargetWords = recommendWords(countWords(chapterText));

  addChapterForm.reset();
  addChapterError.textContent = "";
  chapterContentError.textContent = "";
  addChapterSubmit.disabled = false;
  chapterNumberGroup.hidden   = true;
  chapterContentGroup.hidden  = true;
  wordStatsEl.hidden          = true;
  extractGroup.hidden         = true;
  addChapterForm.hidden       = false;
  wordSelectionView.hidden    = true;
  modalTitleEl.textContent    = `Extraction • Chapitre ${chapter.chapter_number}`;

  levelSelect.value = chapter.level || "B2";
  translationSelect.value = chapter.translation_mode || "translation";

  modalOverlay.hidden = false;
  levelSelect.focus();
}

async function closeModal() {
  // Ferme immédiatement la modale
  modalOverlay.hidden      = true;
  // Remet en état initial pour la prochaine ouverture
  addChapterForm.hidden    = false;
  wordSelectionView.hidden = true;
  modalTitleEl.textContent = "Nouveau chapitre";
  chapterContentError.textContent = "";
  addChapterSubmit.disabled = false;

  // Nettoyage asynchrone : supprime le chapitre créé mais non confirmé
  if (shouldDeletePendingChapter && pendingChapterId !== null) {
    const id     = pendingChapterId;
    pendingChapterId = null;
    pendingWords     = [];
    try {
      await authFetch(`${API_URL}/books/${bookId}/chapters/${id}`, { method: "DELETE" });
    } catch { /* ignore */ }
  } else {
    pendingChapterId = null;
    pendingWords = [];
  }
  modalMode = "create";
  shouldDeletePendingChapter = true;
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

  const modeLabel = chapter.translation_mode === "definition" ? "Définition" : "Traduction";
  const isPending = chapter.status === "pending";
  const chapterTitle = chapter.title || `Chapitre ${chapter.chapter_number}`;

  li.innerHTML = `
    <div class="chapter-card__index">${index}</div>
    <div class="chapter-card__body">
      <div class="chapter-card__title-row">
        <p class="chapter-card__title" data-role="title-value">${escapeHtml(chapterTitle)}</p>
        <button class="chapter-card__edit" type="button" aria-label="Renommer ce chapitre" title="Renommer">✏</button>
      </div>
      <div class="chapter-card__meta">
        <span class="chapter-card__stat">Niveau <strong>${escapeHtml(chapter.level)}</strong></span>
        <span class="chapter-card__stat">${modeLabel}</span>
        ${isPending ? '<span class="chapter-card__status-badge">En attente</span>' : ''}
      </div>
    </div>
    ${isPending ? '<button class="chapter-card__extract" type="button">Extraire le vocabulaire</button>' : ''}
    <button class="chapter-card__delete" aria-label="Supprimer ce chapitre" title="Supprimer">🗑</button>
  `;

  li.querySelector(".chapter-card__delete").addEventListener("click", () =>
    deleteChapter(chapter.id, chapter.chapter_number, li)
  );

  const bodyEl = li.querySelector(".chapter-card__body");
  const titleValueEl = li.querySelector('[data-role="title-value"]');
  const editBtn = li.querySelector(".chapter-card__edit");
  let isEditingTitle = false;

  const cancelEdit = (inputEl) => {
    if (inputEl) inputEl.remove();
    titleValueEl.hidden = false;
    editBtn.hidden = false;
    isEditingTitle = false;
  };

  const saveEdit = async (inputEl) => {
    const nextTitle = inputEl.value.trim();
    if (!nextTitle || nextTitle === titleValueEl.textContent.trim()) {
      cancelEdit(inputEl);
      return;
    }

    inputEl.disabled = true;
    try {
      const res = await authFetch(`${API_URL}/books/${bookId}/chapters/${chapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.detail || "Impossible de renommer ce chapitre.");
        cancelEdit(inputEl);
        return;
      }

      titleValueEl.textContent = data.title || nextTitle;
      cancelEdit(inputEl);
    } catch (err) {
      if (err.message !== "Unauthorized") {
        alert("Impossible de contacter le serveur.");
      }
      cancelEdit(inputEl);
    }
  };

  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isEditingTitle) return;
    isEditingTitle = true;

    const currentTitle = titleValueEl.textContent.trim();
    titleValueEl.hidden = true;
    editBtn.hidden = true;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "chapter-card__title-input";
    input.value = currentTitle;
    input.maxLength = 160;
    input.setAttribute("aria-label", "Titre du chapitre");
    input.addEventListener("click", (evt) => evt.stopPropagation());

    let escapePressed = false;

    input.addEventListener("keydown", async (evt) => {
      evt.stopPropagation();
      if (evt.key === "Enter") {
        evt.preventDefault();
        await saveEdit(input);
      } else if (evt.key === "Escape") {
        evt.preventDefault();
        escapePressed = true;
        cancelEdit(input);
      }
    });

    input.addEventListener("blur", async () => {
      if (escapePressed) return;
      await saveEdit(input);
    });

    titleValueEl.after(input);
    input.focus();
    input.select();
  });

  if (isPending) {
    bodyEl.style.cursor = "default";
    li.querySelector(".chapter-card__extract").addEventListener("click", () => {
      openExtractModal(chapter);
    });
  } else {
    bodyEl.addEventListener("click", () => {
      if (isEditingTitle) return;
      window.location.href = `read.html?id=${chapter.id}&book_id=${bookId}`;
    });
  }

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
    bookTitleEl.textContent   = book.title;
    bookAuthorEl.textContent  = book.author || "";
    document.title            = `ChapterPrep — ${book.title}`;
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

  const chapterNumber  = parseInt(chapterNumberInput.value, 10);
  const level          = levelSelect.value;
  const translationMode = translationSelect.value;
  const text           = contentTextarea.value.trim();
  const wordsToExtract = modalMode === "extract-existing"
    ? extractionTargetWords
    : parseInt(wordsSlider.value, 10);

  if (modalMode === "create") {
    if (!chapterNumber || isNaN(chapterNumber) || chapterNumber < 1) { addChapterError.textContent = "Le numéro de chapitre est obligatoire."; return; }
    if (!text) { addChapterError.textContent = "Le contenu est obligatoire."; return; }
    if (countWords(text) > MAX_CHAPTER_WORDS) {
      chapterContentError.textContent = `Texte trop long : ${countWords(text)} mots (limite : ${MAX_CHAPTER_WORDS}).`;
      addChapterSubmit.disabled = true;
      return;
    }
  }

  setLoading(addChapterSubmit, "Extraction en cours…");

  try {
    let res;
    if (modalMode === "extract-existing") {
      res = await authFetch(`${API_URL}/books/${bookId}/chapters/${pendingChapterId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          words_to_extract: wordsToExtract,
          level,
          translation_mode: translationMode,
        }),
      });
    } else {
      res = await authFetch(`${API_URL}/books/${bookId}/chapters`, {
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
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) { addChapterError.textContent = data.detail || "Erreur lors de l'enregistrement."; return; }

    shouldDeletePendingChapter = modalMode === "create";
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
      const li   = document.createElement("li");
      li.className     = "word-item";
      li.dataset.index = i;
      const cbId = `word-cb-${i}`;
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
  // Supprime silencieusement le chapitre non confirmé uniquement en mode création
  if (shouldDeletePendingChapter && pendingChapterId !== null) {
    const id     = pendingChapterId;
    pendingChapterId = null;
    pendingWords     = [];
    try {
      await authFetch(`${API_URL}/books/${bookId}/chapters/${id}`, { method: "DELETE" });
    } catch { /* ignore */ }
  }
  wordSelectionView.hidden = true;
  addChapterForm.hidden    = false;
  modalTitleEl.textContent = modalMode === "extract-existing" ? "Extraction du vocabulaire" : "Nouveau chapitre";

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
  if (!confirm(`Supprimer le chapitre ${chapterNumber} ? Cette action est irréversible.`)) return;

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
      chapterList.hidden  = true;
      emptyState.hidden   = false;
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
// loadBook() puis loadChapters() en séquence
async function init() {
  await loadBook();
  await loadChapters();
}

init();
