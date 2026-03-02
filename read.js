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
  const knownSet = new Set(knownWords.map((w) => String(w.word).toLowerCase()));
  const tokens = text.split(/(\s+|[.,!?;:'"()—\-])/);

  return tokens.map((token) => {
    if (!token.trim() || /^[.,!?;:'"()—\-]+$/.test(token)) return token;
    const isKnown = knownSet.has(token.toLowerCase());
    const safeToken = escapeHtml(token);
    return `<span class="word${isKnown ? " word--known" : ""}" data-word="${safeToken}">${safeToken}</span>`;
  }).join("");
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
    li.innerHTML = `
      <span class="vocab-item__word">${escapeHtml(word.word)}</span>
      <span class="vocab-item__output">${escapeHtml(word.output)}</span>
    `;
    vocabListEl.appendChild(li);
  });
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
  if (!e.target.classList.contains("word")) return;
  const word = e.target.dataset.word;
  if (!word) return;
  await translateWord(word);
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
