"""Text extraction from PDFs and images, with OCR fallback."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def _extract_pdf_pymupdf(path: Path) -> list[str]:
    """Extract text per page using PyMuPDF."""
    import fitz  # PyMuPDF

    pages: list[str] = []
    doc = fitz.open(str(path))
    for page in doc:
        pages.append(page.get_text("text") or "")
    doc.close()
    return pages


def _extract_pdf_pypdf(path: Path) -> list[str]:
    """Fallback extraction using pypdf."""
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    pages: list[str] = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return pages


def _ocr_image_bytes(image_bytes: bytes) -> str:
    """OCR an image using Tesseract (pytesseract) or fallback. Returns extracted text."""
    try:
        import io
        from PIL import Image
        import pytesseract

        processed_bytes = preprocess_image(image_bytes)
        img = Image.open(io.BytesIO(processed_bytes)).convert("RGB")
        text = pytesseract.image_to_string(img, config="--psm 1 --oem 3")
        if text.strip():
            return text.strip()
        # Fallback to psm 3 if psm 1 returned empty
        text = pytesseract.image_to_string(img, config="--psm 3")
        return text.strip()
    except Exception as tesseract_err:
        logger.info("pytesseract execution note: %s. Attempting fallback...", tesseract_err)

    try:
        import easyocr
        import numpy as np
        from PIL import Image

        processed_bytes = preprocess_image(image_bytes)
        reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        img = Image.open(__import__("io").BytesIO(processed_bytes)).convert("RGB")
        arr = np.array(img)
        result = reader.readtext(arr, detail=0, paragraph=True)
        return "\n".join(result).strip()
    except Exception as exc:
        logger.warning("OCR engines unavailable or failed: %s", exc)
        return ""


def _ocr_pdf_page(page_image_bytes: bytes) -> str:
    return _ocr_image_bytes(page_image_bytes)


def extract_text(path: Path, mime_type: str | None = None) -> tuple[list[str], str, bool]:
    """Extract per-page text from a file.

    Returns (pages, method, ocr_used).
    """
    suffix = path.suffix.lower()
    pages: list[str] = []
    method = "text-extraction"
    ocr_used = False

    if suffix == ".pdf":
        try:
            pages = _extract_pdf_pymupdf(path)
            method = "pymupdf"
        except Exception:
            try:
                pages = _extract_pdf_pypdf(path)
                method = "pypdf"
            except Exception as exc:
                logger.warning("PDF text extraction failed for %s: %s", path.name, exc)
                pages = []
                method = "ocr"

        # If PDF yielded no usable text, try OCR on rendered pages
        if not any(p.strip() for p in pages):
            ocr_used = True
            method = "ocr"
            pages = _ocr_pdf(path)
    elif suffix in {".jpg", ".jpeg", ".png"}:
        ocr_used = True
        method = "ocr"
        text = _ocr_image_bytes(path.read_bytes())
        pages = [text]
    elif suffix == ".txt":
        pages = [path.read_text(encoding="utf-8", errors="ignore")]
        method = "plaintext"
    else:
        pages = [""]
        method = "unsupported"

    return pages, method, ocr_used


def _ocr_pdf(path: Path) -> list[str]:
    """Render each PDF page to an image and OCR it."""
    try:
        import fitz

        pages: list[str] = []
        doc = fitz.open(str(path))
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")
            pages.append(_ocr_image_bytes(img_bytes))
        doc.close()
        return pages
    except Exception as exc:  # pragma: no cover
        logger.warning("PDF OCR failed for %s: %s", path.name, exc)
        return [""] * 1


def preprocess_image(image_bytes: bytes) -> bytes:
    """Correct orientation, contrast, and noise for better OCR. Returns PNG bytes."""
    try:
        from PIL import Image, ImageEnhance, ImageOps

        img = Image.open(__import__("io").BytesIO(image_bytes)).convert("RGB")
        img = ImageOps.exif_transpose(img)
        img = ImageEnhance.Contrast(img).enhance(1.6)
        img = ImageEnhance.Sharpness(img).enhance(1.4)
        out = __import__("io").BytesIO()
        img.save(out, format="PNG")
        return out.getvalue()
    except Exception:  # pragma: no cover
        return image_bytes
