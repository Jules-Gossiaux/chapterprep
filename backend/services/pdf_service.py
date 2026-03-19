import pymupdf
import re

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