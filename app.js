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
const resendEmailInput = document.getElementById("resend-email");
const resendBtn = document.getElementById("resend-btn");
const resendMessage = document.getElementById("resend-message");

const VERIFICATION_MESSAGES = {
  verified: "Email verified. You can now log in.",
  expired: "This confirmation link has expired. Request a new one.",
  invalid: "Invalid confirmation link. Request a new one.",
};

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
    resendMessage.textContent = "";
  });
});

applyVerificationStateFromQuery();

// ─────────────────────────────────────────────
//  Helpers UI
// ─────────────────────────────────────────────

/**
 * Met le bouton en état chargement (spinner).
 * @param {HTMLButtonElement} btn
 * @param {string} label - Texte affiché pendant le chargement
 */
function setLoading(btn, label = "Loading...") {
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

function showLoginTab() {
  tabs.forEach((t) => t.classList.remove("tab--active"));
  document.querySelector('[data-tab="login"]').classList.add("tab--active");
  registerForm.classList.remove("form--active");
  loginForm.classList.add("form--active");
}

function applyVerificationStateFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const verified = params.get("verified");
  const error = params.get("error");

  if (verified === "true") {
    showLoginTab();
    loginError.textContent = "";
    loginSuccess.textContent = VERIFICATION_MESSAGES.verified;
  }

  if (error === "expired" || error === "invalid") {
    showLoginTab();
    loginSuccess.textContent = "";
    loginError.textContent = VERIFICATION_MESSAGES[error];
  }

  if (verified || error) {
    window.history.replaceState({}, "", window.location.pathname);
  }
}

// ─────────────────────────────────────────────
//  Connexion
// ─────────────────────────────────────────────
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent  = "";
  loginSuccess.textContent = "";
  resendMessage.textContent = "";
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  // Validation côté client
  if (!username || !password) {
    loginError.textContent = "All fields are required.";
    return;
  }

  setLoading(loginBtn, "Logging in...");

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
      loginError.textContent = data.detail || "Invalid credentials.";
      return;
    }

    // Stockage du token et des infos utiles
    localStorage.setItem("token",    data.access_token);
    localStorage.setItem("username", username);
    localStorage.setItem("user_id",  String(data.user_id));

    // Redirection vers l'app principale (à créer)
    window.location.href = "app.html";
  } catch (err) {
    loginError.textContent = "Unable to reach the server. Please check your connection.";
    console.error(err);
  } finally {
    resetBtn(loginBtn, "Log in");
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
    registerError.textContent = "All fields are required.";
    return;
  }

  if (password.length < 8) {
    registerError.textContent = "Password must be at least 8 characters long.";
    return;
  }

  if (password !== passwordConfirm) {
    registerError.textContent = "Passwords do not match.";
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    registerError.textContent = "Invalid email address.";
    return;
  }

  setLoading(registerBtn, "Creating account...");

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      registerError.textContent = data.detail || "Signup failed.";
      return;
    }

    // Succès : on bascule vers l'onglet connexion avec un message de confirmation
    showLoginTab();

    loginSuccess.textContent = `Account created for ${username}. Verify your email before logging in.`;

    // Pré-remplir le champ username dans la connexion
    document.getElementById("login-username").value = username;
    resendEmailInput.value = email;
  } catch (err) {
    registerError.textContent = "Unable to reach the server. Please check your connection.";
    console.error(err);
  } finally {
    resetBtn(registerBtn, "Create account");
  }
});

resendBtn.addEventListener("click", async () => {
  loginError.textContent = "";
  loginSuccess.textContent = "";
  resendMessage.textContent = "";

  const email = resendEmailInput.value.trim().toLowerCase();
  if (!email) {
    resendMessage.textContent = "Enter your email to receive a new link.";
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    resendMessage.textContent = "Invalid email format.";
    return;
  }

  setLoading(resendBtn, "Sending...");
  try {
    const response = await fetch(`${API_URL}/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      resendMessage.textContent = data.detail || "Unable to send the link right now.";
      return;
    }

    resendMessage.textContent = data.message || "If an account exists, an email has been sent.";
  } catch (err) {
    resendMessage.textContent = "Unable to reach the server. Please try again.";
    console.error(err);
  } finally {
    resetBtn(resendBtn, "Resend");
  }
});
