"""Service dedie a l'envoi d'emails transactionnels via Resend."""

import httpx

import config

RESEND_API_URL = "https://api.resend.com/emails"


def send_verification_email(to_email: str, username: str, verify_url: str) -> None:
    """Envoie l'email de verification de compte."""
    if not config.RESEND_API_KEY or not config.RESEND_FROM_EMAIL:
        raise RuntimeError("Configuration email manquante (RESEND_API_KEY / RESEND_FROM_EMAIL).")

    html = f"""
    <div style=\"font-family: Arial, sans-serif; line-height: 1.5; color: #1e1e1e;\">
      <h2>Confirme ton adresse email</h2>
      <p>Bonjour {username},</p>
      <p>Merci pour ton inscription sur ChapterPrep.</p>
      <p>
        <a href=\"{verify_url}\" style=\"display:inline-block;padding:10px 16px;background:#3b5e4a;color:#fff;text-decoration:none;border-radius:6px;\">
          Confirmer mon email
        </a>
      </p>
      <p>Ce lien expire dans {config.EMAIL_VERIFICATION_EXPIRE_HOURS} heures.</p>
      <p>Si tu n'es pas a l'origine de cette demande, tu peux ignorer cet email.</p>
    </div>
    """.strip()

    payload = {
        "from": config.RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": "Confirme ton email - ChapterPrep",
        "html": html,
    }
    headers = {
        "Authorization": f"Bearer {config.RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=10.0) as client:
        response = client.post(RESEND_API_URL, json=payload, headers=headers)
        response.raise_for_status()
