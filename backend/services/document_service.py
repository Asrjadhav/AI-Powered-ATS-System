"""
Plain-text extraction from uploaded documents.

The product accepts PDF, DOCX and TXT, for both resumes and job descriptions.
All three are decoded here, from raw bytes, on the server. Clients upload the
file untouched; they never read, decode or base64-encode it, so text stays
correctly decoded as UTF-8 rather than being mangled by the browser's
byte-oriented atob().
"""

import io
import os
from typing import List, Optional

PDF_EXTENSIONS = (".pdf",)
WORD_EXTENSIONS = (".docx",)
PLAIN_TEXT_EXTENSIONS = (".txt",)

# Legacy Word is recognised only so it can be rejected with a useful message
# rather than a generic "unsupported file" error.
LEGACY_WORD_EXTENSIONS = (".doc",)

SUPPORTED_EXTENSIONS = PDF_EXTENSIONS + WORD_EXTENSIONS + PLAIN_TEXT_EXTENSIONS

# Shown to the user whenever an upload is rejected.
SUPPORTED_FORMATS_LABEL = "PDF, DOCX or TXT"

# Encodings tried in order when decoding text-based uploads.
TEXT_ENCODINGS = ("utf-8-sig", "utf-8", "cp1252", "latin-1")


class DocumentExtractionError(Exception):
    """Raised when a document's format is recognised but cannot be read."""


def get_extension(filename: Optional[str]) -> str:
    if not filename:
        return ""
    return os.path.splitext(filename.lower())[1]


def decode_text_bytes(file_bytes: bytes) -> str:
    """
    Decodes text bytes, trying UTF-8 first and falling back progressively.

    latin-1 never raises, so this always returns something rather than losing
    the upload to a decoding error.
    """
    for encoding in TEXT_ENCODINGS:
        try:
            return file_bytes.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            continue
    return file_bytes.decode("latin-1", errors="replace")


def _extract_pdf(file_bytes: bytes) -> str:
    import pypdf

    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    pages: List[str] = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            pages.append(page_text)
    return "\n\n".join(pages).strip()


def _extract_docx(file_bytes: bytes) -> str:
    import docx

    document = docx.Document(io.BytesIO(file_bytes))
    parts: List[str] = [p.text for p in document.paragraphs if p.text and p.text.strip()]

    # Job descriptions are often laid out in tables; read those too.
    for table in document.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells if cell.text and cell.text.strip()]
            if cells:
                parts.append(" | ".join(cells))

    return "\n".join(parts).strip()


def extract_text(file_bytes: bytes, filename: Optional[str]) -> str:
    """
    Returns the plain text of an uploaded PDF, DOCX or TXT document.

    Raises DocumentExtractionError when the file type is not supported, or
    when it is supported but cannot be read, so callers report a real failure
    instead of proceeding with empty or invented content.
    """
    if not file_bytes:
        return ""

    extension = get_extension(filename)

    if extension in LEGACY_WORD_EXTENSIONS:
        raise DocumentExtractionError(
            "Legacy .doc files are not supported. Please save the document as "
            ".docx or PDF and upload it again."
        )

    if extension not in SUPPORTED_EXTENSIONS:
        raise DocumentExtractionError(
            f"Unsupported file type '{extension or 'unknown'}'. "
            f"Upload a {SUPPORTED_FORMATS_LABEL} file."
        )

    try:
        if extension in PDF_EXTENSIONS:
            return _extract_pdf(file_bytes)
        if extension in WORD_EXTENSIONS:
            return _extract_docx(file_bytes)
        return decode_text_bytes(file_bytes).strip()
    except ImportError as missing_dependency:
        raise DocumentExtractionError(
            f"Server is missing a library needed to read {extension} files: "
            f"{missing_dependency}"
        ) from missing_dependency
    except Exception as extraction_error:
        raise DocumentExtractionError(
            f"Could not read the uploaded {extension} file. "
            "It may be corrupt or password protected."
        ) from extraction_error
