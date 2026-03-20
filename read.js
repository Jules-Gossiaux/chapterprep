const API_URL = "http://localhost:8000";

const token = localStorage.getItem("token");
const username = localStorage.getItem("username");

if (!token || !username) {
  window.location.href = "index.html";
}

const params = new URLSearchParams(window.location.search);
const chapterId = Number.parseInt(params.get("id"), 10);
const bookId = Number.parseInt(params.get("book_id"), 10);

if (!chapterId || !bookId) {
  window.location.href = "app.html";
}

const navUsernameEl = document.getElementById("nav-username");
const logoutBtn = document.getElementById("logout-btn");
const backLinkEl = document.getElementById("back-link");
const chapterTitleEl = document.getElementById("chapter-title");
const chapterMetaEl = document.getElementById("chapter-meta");
const chapterTextEl = document.getElementById("chapter-text");
const panelTranslationEl = document.getElementById("panel-translation");
const vocabListEl = document.getElementById("vocab-list");
const exportBtn = document.getElementById("export-btn");
const readErrorEl = document.getElementById("read-error");
const vocabErrorEl = document.getElementById("vocab-error");

let vocabWords = [];
let currentTranslation = null;
let suppressNextWordClick = false;

const MAX_SELECTION_LENGTH = 180;

navUsernameEl.textContent = username;
backLinkEl.href = `book.html?id=${bookId}`;

logoutBtn.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function normalizeSelectedText(text) {
  if (!text) return "";
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return compact.replace(/^[\s"“”'‘’.,!?;:()\-—]+|[\s"“”'‘’.,!?;:()\-—]+$/g, "").trim();
}

async function authFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    localStorage.clear();
    window.location.href = "index.html";
    throw new Error("Unauthorized");
  }

  return response;
}

function renderText(text, knownWords) {
  // Sépare mots composés (avec espace) et mots simples
  const multiWords = knownWords.filter((w) => w.word.includes(" "));
  const singleWords = new Set(
    knownWords.filter((w) => !w.word.includes(" ")).map((w) => w.word.toLowerCase())
  );

  // Remplace les mots composés par des placeholders, du plus long au plus court
  // pour éviter que "lay aside" soit écrasé avant "lay aside the book"
  let processed = text;
  const placeholders = [];
  multiWords
    .sort((a, b) => b.word.length - a.word.length)
    .forEach((w, i) => {
      const placeholder = `%%MULTI${i}%%`;
      const regex = new RegExp(w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const span = `<span class="word word--known" data-word="${escapeHtml(w.word)}">${escapeHtml(w.word)}</span>`;
      if (regex.test(processed)) {
        processed = processed.replace(regex, placeholder);
        placeholders.push({ placeholder, span });
      }
    });

  // Traite les mots simples token par token
  const tokens = processed.split(/(\s+|[.,!?;:'"()—\-])/);
  let html = tokens.map((token) => {
    if (!token.trim() || /^[.,!?;:'"()—\-]+$/.test(token)) return token;
    if (token.startsWith("%%MULTI")) return token;
    const isKnown = singleWords.has(token.toLowerCase());
    const safeToken = escapeHtml(token);
    return `<span class="word${isKnown ? " word--known" : ""}" data-word="${safeToken}">${safeToken}</span>`;
  }).join("");

  // Réinjecte les spans des mots composés (replaceAll pour couvrir les doublons)
  for (const { placeholder, span } of placeholders) {
    html = html.replaceAll(placeholder, span);
  }

  return html;
}

function renderVocabList(words) {
  vocabListEl.innerHTML = "";

  if (words.length === 0) {
    const li = document.createElement("li");
    li.className = "vocab-item";
    li.innerHTML = '<span class="vocab-item__output">Aucun mot enregistré pour ce chapitre.</span>';
    vocabListEl.appendChild(li);
    return;
  }

  words.forEach((word) => {
    const li = document.createElement("li");
    li.className = "vocab-item";
    li.dataset.id = word.id;
    li.innerHTML = `
      <span class="vocab-item__word">${escapeHtml(word.word)}</span>
      <span class="vocab-item__arrow">→</span>
      <span class="vocab-item__output">${escapeHtml(word.output)}</span>
      <button class="vocab-item__delete" aria-label="Supprimer ce mot" title="Supprimer">🗑</button>
    `;
    li.querySelector(".vocab-item__delete").addEventListener("click", () =>
      deleteWord(word.id, li)
    );
    vocabListEl.appendChild(li);
  });
}

async function deleteWord(wordId, cardEl) {
  try {
    const response = await authFetch(
      `${API_URL}/books/${bookId}/chapters/${chapterId}/words/${wordId}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      vocabErrorEl.textContent = data.detail || "Impossible de supprimer ce mot.";
      return;
    }

    vocabWords = vocabWords.filter((w) => w.id !== wordId);
    cardEl.remove();
    if (vocabWords.length === 0) {
      renderVocabList([]);
    }
  } catch (err) {
    if (err.message !== "Unauthorized") {
      vocabErrorEl.textContent = "Impossible de contacter le serveur.";
    }
  }
}

function markWordAsKnown(word) {
  const normalized = word.toLowerCase();
  chapterTextEl.querySelectorAll(".word").forEach((el) => {
    if ((el.dataset.word || "").toLowerCase() === normalized) {
      el.classList.add("word--known");
    }
  });
}

function renderTranslationPlaceholder(message = "Clique sur un mot pour obtenir sa traduction.") {
  panelTranslationEl.innerHTML = `<p class="translation-placeholder">${escapeHtml(message)}</p>`;
}

function renderTranslationResult(word, translation, note = "") {
  panelTranslationEl.innerHTML = `
    <div class="translation-result">
      <span class="translation-word">${escapeHtml(word)}</span>
      <span class="translation-arrow">→</span>
      <span class="translation-output">${escapeHtml(translation)}</span>
      <button class="btn btn--primary" id="add-word-btn">+ Ajouter à ma liste</button>
    </div>
    <p class="translation-note" id="translation-note">${escapeHtml(note)}</p>
  `;
}

async function loadPage() {
  readErrorEl.textContent = "";

  try {
    const [chapterRes, wordsRes] = await Promise.all([
      authFetch(`${API_URL}/books/${bookId}/chapters/${chapterId}`),
      authFetch(`${API_URL}/books/${bookId}/chapters/${chapterId}/words`),
    ]);

    const chapterData = await chapterRes.json().catch(() => ({}));
    const wordsData = await wordsRes.json().catch(() => []);

    if (!chapterRes.ok) {
      readErrorEl.textContent = chapterData.detail || "Impossible de charger le chapitre.";
      chapterTextEl.innerHTML = "";
      return;
    }

    if (!wordsRes.ok) {
      readErrorEl.textContent = wordsData.detail || "Impossible de charger les mots du chapitre.";
      vocabWords = [];
    } else {
      vocabWords = Array.isArray(wordsData) ? wordsData : [];
    }

    chapterTitleEl.textContent = `Chapitre ${chapterData.chapter_number}`;
    const modeLabel = chapterData.translation_mode === "definition" ? "Définition" : "Traduction";
    chapterMetaEl.textContent = `Niveau ${chapterData.level} • ${modeLabel}`;
    chapterTextEl.innerHTML = renderText(chapterData.text || "", vocabWords);
    renderVocabList(vocabWords);
  } catch (err) {
    if (err.message !== "Unauthorized") {
      readErrorEl.textContent = "Impossible de contacter le serveur.";
    }
  }
}

async function translateWord(word) {
  renderTranslationPlaceholder("Traduction en cours…");

  try {
    const response = await authFetch(`${API_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapter_id: chapterId, word }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      renderTranslationPlaceholder(data.detail || "Impossible de traduire ce mot.");
      currentTranslation = null;
      return;
    }

    currentTranslation = {
      word: data.word,
      base_form: data.word,
      output: data.translation,
    };

    const alreadyKnown = vocabWords.some((w) => String(w.word).toLowerCase() === data.word.toLowerCase());
    renderTranslationResult(data.word, data.translation, alreadyKnown ? "Déjà dans ta liste" : "");

    if (alreadyKnown) {
      const addBtn = document.getElementById("add-word-btn");
      if (addBtn) addBtn.hidden = true;
    }
  } catch (err) {
    if (err.message !== "Unauthorized") {
      renderTranslationPlaceholder("Impossible de contacter le serveur de traduction.");
    }
  }
}

async function addCurrentWord() {
  if (!currentTranslation) return;

  vocabErrorEl.textContent = "";

  try {
    const response = await authFetch(`${API_URL}/books/${bookId}/chapters/${chapterId}/words/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentTranslation),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 409) {
      const noteEl = document.getElementById("translation-note");
      if (noteEl) noteEl.textContent = "Déjà dans ta liste";
      const addBtn = document.getElementById("add-word-btn");
      if (addBtn) addBtn.hidden = true;
      return;
    }

    if (!response.ok) {
      vocabErrorEl.textContent = data.detail || "Impossible d'ajouter ce mot.";
      return;
    }

    vocabWords.push(data);
    renderVocabList(vocabWords);
    markWordAsKnown(data.word);

    const addBtn = document.getElementById("add-word-btn");
    if (addBtn) addBtn.hidden = true;
    const noteEl = document.getElementById("translation-note");
    if (noteEl) noteEl.textContent = "Ajouté à ta liste";
  } catch (err) {
    if (err.message !== "Unauthorized") {
      vocabErrorEl.textContent = "Impossible de contacter le serveur.";
    }
  }
}

function exportCSV(words) {
  const rows = words.map((w) => `${w.word}\t${w.output}`);
  const content = rows.join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vocabulaire.txt";
  a.click();
  URL.revokeObjectURL(url);
}

chapterTextEl.addEventListener("click", async (e) => {
  if (suppressNextWordClick) {
    suppressNextWordClick = false;
    return;
  }
  if (!e.target.classList.contains("word")) return;
  const word = e.target.dataset.word;
  if (!word) return;
  await translateWord(word);
});

chapterTextEl.addEventListener("mouseup", async () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  if (!chapterTextEl.contains(range.commonAncestorContainer)) return;

  const selectedText = normalizeSelectedText(selection.toString());
  if (!selectedText) return;

  suppressNextWordClick = true;

  if (selectedText.length > MAX_SELECTION_LENGTH) {
    currentTranslation = null;
    renderTranslationPlaceholder("Sélection trop longue. Limite: 180 caractères.");
    selection.removeAllRanges();
    return;
  }

  await translateWord(selectedText);
  selection.removeAllRanges();
});

panelTranslationEl.addEventListener("click", async (e) => {
  if (e.target.id !== "add-word-btn") return;
  await addCurrentWord();
});

exportBtn.addEventListener("click", () => {
  if (vocabWords.length === 0) {
    vocabErrorEl.textContent = "Aucun mot à exporter.";
    return;
  }
  vocabErrorEl.textContent = "";
  exportCSV(vocabWords);
});

loadPage();
