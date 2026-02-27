"""
Prompt de construction pour l'extraction de vocabulaire via Gemini.
"""

_LEVEL_GUIDANCE = {
    "A1": (
        "Sélectionne des mots très courants que quelqu'un de niveau débutant absolu "
        "ne connaît probablement pas encore : noms concrets, adjectifs simples, verbes de base. "
        "Évite les mots que tout le monde reconnaît à l'oral (bonjour, merci, etc.)."
    ),
    "A2": (
        "Sélectionne des mots de vocabulaire élémentaire que quelqu'un de niveau A2 "
        "rencontre encore avec difficulté : vocabulaire de la vie quotidienne, "
        "adjectifs courants, verbes fréquents en dehors du noyau de base."
    ),
    "B1": (
        "Sélectionne des mots de niveau intermédiaire : vocabulaire thématique plus précis, "
        "expressions courantes, verbes à nuance, faux-amis fréquents. "
        "Évite les mots très simples mais aussi les mots rares."
    ),
    "B2": (
        "Sélectionne des mots de niveau intermédiaire-avancé : vocabulaire soutenu, "
        "expressions idiomatiques courantes, collocations, termes spécialisés accessibles. "
        "Préfère les mots qui enrichissent réellement le vocabulaire actif."
    ),
    "C1": (
        "Sélectionne des mots de niveau avancé : vocabulaire soutenu ou littéraire, "
        "idiomes, collocations précises, termes spécialisés. "
        "Les mots doivent être un vrai défi même pour un bon locuteur."
    ),
    "C2": (
        "Sélectionne des mots rares, idiomatiques ou très spécialisés que seuls les "
        "locuteurs quasi-natifs maîtrisent : archaïsmes, régionalismes, jargon précis, "
        "expressions figées subtiles. Réserve les mots vraiment difficiles."
    ),
}

_OUTPUT_GUIDANCE = {
    "translation": (
        "Pour chaque mot, le champ \"output\" contient la traduction en français, "
        "courte et précise (1 à 4 mots maximum)."
    ),
    "definition": (
        "Pour chaque mot, le champ \"output\" contient une définition simple dans la "
        "langue cible ({target_language}), en une phrase courte (15 mots maximum), "
        "compréhensible pour quelqu'un de niveau {level}."
    ),
}


def build_prompt(
    text: str,
    level: str,
    target_language: str,
    word_count: int,
    translation_mode: str,
) -> str:
    """
    Construit le prompt envoyé à Gemini pour extraire du vocabulaire.

    Returns:
        str: Le prompt complet attendant un JSON uniquement en réponse.
    """
    level_guidance = _LEVEL_GUIDANCE[level]

    output_guidance = _OUTPUT_GUIDANCE[translation_mode].format(
        target_language=target_language,
        level=level,
    )

    return f"""Tu es un expert en didactique des langues. Ton rôle est d'extraire du vocabulaire utile à apprendre depuis un texte en {target_language}.

TEXTE SOURCE :
---
{text}
---

CONSIGNES :
- Niveau de l'apprenant : {level}
- {level_guidance}
- Sélectionne EXACTEMENT {word_count} mots ou expressions depuis le texte.
- {output_guidance}
- Le champ "word" contient le mot tel qu'il apparaît dans le texte.
- Le champ "base_form" contient la forme canonique : infinitif pour les verbes, nominatif singulier pour les noms, masculin singulier pour les adjectifs.
- Ne sélectionne pas les noms propres (prénoms, lieux).
- Ne sélectionne pas les mots identiques en français et dans la langue cible.
- Retourne UNIQUEMENT un tableau JSON valide, sans texte avant, sans texte après, sans bloc de code markdown.

FORMAT DE RÉPONSE ATTENDU (exemple) :
[
  {{
    "word": "la forme du mot dans le texte",
    "base_form": "forme canonique",
    "output": "traduction ou définition"
  }}
]

Retourne maintenant le tableau JSON pour les {word_count} mots sélectionnés."""
