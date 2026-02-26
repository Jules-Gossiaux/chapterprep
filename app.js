// ─────────────────────────────────────────────
//  Configuration
// ─────────────────────────────────────────────
const API_URL = "http://localhost:8000"; // remplace par ton URL de prod en déploiement

// ─────────────────────────────────────────────
//  Sélecteurs
// ─────────────────────────────────────────────
const tabs          = document.querySelectorAll(".tab");
const loginForm     = document.getElementById("login-form");
const registerForm  = document.getElementById("register-form");
const loginError    = document.getElementById("login-error");
const loginSuccess  = document.getElementById("login-success");
const registerError = document.getElementById("register-error");
const loginBtn      = document.getElementById("login-btn");
const registerBtn   = document.getElementById("register-btn");

// ─────────────────────────────────────────────
//  Onglets : basculer entre connexion / inscription
// ─────────────────────────────────────────────
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;

    // Mise à jour des onglets
    tabs.forEach((t) => t.classList.remove("tab--active"));
    tab.classList.add("tab--active");

    // Affichage du bon formulaire
    loginForm.classList.remove("form--active");
    registerForm.classList.remove("form--active");

    if (target === "login") {
      loginForm.classList.add("form--active");
    } else {
      registerForm.classList.add("form--active");
    }

    // Réinitialise les messages d'erreur
    loginError.textContent   = "";
    loginSuccess.textContent  = "";
    registerError.textContent = "";
  });
});

// ─────────────────────────────────────────────
//  Helpers UI
// ─────────────────────────────────────────────

/**
 * Met le bouton en état chargement (spinner).
 * @param {HTMLButtonElement} btn
 * @param {string} label - Texte affiché pendant le chargement
 */
function setLoading(btn, label = "Chargement…") {
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${label}`;
}

/**
 * Remet le bouton à son état normal.
 * @param {HTMLButtonElement} btn
 * @param {string} label - Texte original du bouton
 */
function resetBtn(btn, label) {
  btn.disabled = false;
  btn.textContent = label;
}

// ─────────────────────────────────────────────
//  Connexion
// ─────────────────────────────────────────────
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent  = "";
  loginSuccess.textContent = "";

  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  // Validation côté client
  if (!username || !password) {
    loginError.textContent = "Tous les champs sont obligatoires.";
    return;
  }

  setLoading(loginBtn, "Connexion…");

  try {
    // FastAPI attend les credentials de login en form-data (OAuth2PasswordRequestForm)
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      loginError.textContent = data.detail || "Identifiants incorrects.";
      return;
    }

    // Stockage du token et des infos utiles
    localStorage.setItem("token",    data.access_token);
    localStorage.setItem("username", username);
    localStorage.setItem("user_id",  String(data.user_id));

    // Redirection vers l'app principale (à créer)
    window.location.href = "app.html";
  } catch (err) {
    loginError.textContent = "Impossible de contacter le serveur. Vérifie ta connexion.";
    console.error(err);
  } finally {
    resetBtn(loginBtn, "Se connecter");
  }
});

// ─────────────────────────────────────────────
//  Inscription
// ─────────────────────────────────────────────
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  registerError.textContent = "";

  const username        = document.getElementById("reg-username").value.trim();
  const email           = document.getElementById("reg-email").value.trim();
  const password        = document.getElementById("reg-password").value;
  const passwordConfirm = document.getElementById("reg-password-confirm").value;

  // Validation côté client
  if (!username || !email || !password || !passwordConfirm) {
    registerError.textContent = "Tous les champs sont obligatoires.";
    return;
  }

  if (password.length < 8) {
    registerError.textContent = "Le mot de passe doit contenir au moins 8 caractères.";
    return;
  }

  if (password !== passwordConfirm) {
    registerError.textContent = "Les mots de passe ne correspondent pas.";
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    registerError.textContent = "L'adresse email n'est pas valide.";
    return;
  }

  setLoading(registerBtn, "Création…");

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      registerError.textContent = data.detail || "Erreur lors de l'inscription.";
      return;
    }

    // Succès : on bascule vers l'onglet connexion avec un message de confirmation
    tabs.forEach((t) => t.classList.remove("tab--active"));
    document.querySelector('[data-tab="login"]').classList.add("tab--active");
    registerForm.classList.remove("form--active");
    loginForm.classList.add("form--active");

    loginSuccess.textContent = `Compte créé ! Tu peux maintenant te connecter, ${username}.`;

    // Pré-remplir le champ username dans la connexion
    document.getElementById("login-username").value = username;
  } catch (err) {
    registerError.textContent = "Impossible de contacter le serveur. Vérifie ta connexion.";
    console.error(err);
  } finally {
    resetBtn(registerBtn, "Créer un compte");
  }
});
