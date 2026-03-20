import pymupdf
import re


def is_text_garbage(text: str) -> bool:
    """Heuristique MVP: ratio de caractères spéciaux + répétitions de ponctuation."""
    if not text:
        return True

    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return True

    # 1) Ratio de caractères spéciaux (hors lettres/chiffres/espaces/ponctuation standard)
    total = len(cleaned)
    special_chars = len(re.findall(r"[^\w\sÀ-ÖØ-öø-ÿ.,;:!?()'\"\-]", cleaned))
    special_ratio = special_chars / total if total else 1.0

    # 2) Détection de répétitions de ponctuation (ex: ! ! ! ! ! ou !!!!! )
    repeated_spaced = bool(re.search(r"([!?#$%&*])(?:\s*\1){4,}", cleaned))
    repeated_compact = bool(re.search(r"[!?#$%&*]{5,}", cleaned))

    return special_ratio > 0.35 or repeated_spaced or repeated_compact


def extract_chapters_from_pdf(file_bytes: bytes, target_words: int) -> list[str]:
    try:
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        raise ValueError("Le fichier PDF est invalide ou corrompu.")
        
    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n"
        
    # Séparer par double retour à la ligne pour avoir les paragraphes
    paragraphs = re.split(r'\n\s*\n', full_text)
    
    chapters = []
    current_chapter = []
    current_word_count = 0
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if is_text_garbage(para):
            continue
            
        # Nettoyer un peu les retours à la ligne isolés dans le paragraphe
        para = re.sub(r'\s+', ' ', para).strip()
        words = len(para.split())
        if words == 0:
            continue
            
        if current_word_count > 0 and current_word_count + words > target_words:
            chapters.append("\n\n".join(current_chapter))
            current_chapter = [para]
            current_word_count = words
        else:
            current_chapter.append(para)
            current_word_count += words
            
    if current_chapter:
        chapters.append("\n\n".join(current_chapter))
        
    return chapters