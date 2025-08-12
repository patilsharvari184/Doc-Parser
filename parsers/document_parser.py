import fitz  # PyMuPDF
#import pytesseract
from PIL import Image
import io
import os
import pytesseract

pytesseract.pytesseract.tesseract_cmd = r"C://Program Files//Tesseract-OCR//tesseract.exe"


# Optional: Set path to tesseract.exe (for Windows only)
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text_from_pdf(pdf_path: str) -> str:
    text_output = []

    doc = fitz.open(pdf_path)
    for page_number in range(len(doc)):
        page = doc.load_page(page_number)
        pix = page.get_pixmap(dpi=300)  # better quality for OCR
        img_data = pix.tobytes("png")

        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(img_data)).convert("L")  # grayscale
        ocr_text = pytesseract.image_to_string(image, lang='eng')
        text_output.append(ocr_text.strip())

    return "\n\n".join(text_output)

def extract_chunks_with_metadata(file_path, max_chars=1000):
    doc = fitz.open(file_path)
    chunks = []

    for i in range(len(doc)):
        page_text = doc[i].get_text()
        page_num = i + 1

        for j in range(0, len(page_text), max_chars):
            chunk_text = page_text[j:j + max_chars]
            if chunk_text.strip():
                chunks.append({
                    "content": chunk_text,
                    "page": page_num,
                    "source": f"Page {page_num}"
                })

    return chunks
