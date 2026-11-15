import re
from pathlib import Path
from fastapi import HTTPException, status
from app.config import settings

# Recognized magic bytes for image types
MAGIC_SIGNATURES = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"], # WEBP also has WEBP at offset 8
    "image/bmp": [b"BM"]
}

EXTENSION_TO_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".bmp": "image/bmp"
}

def sanitize_filename(filename: str) -> str:
    """Sanitizes filename to prevent directory traversal and invalid characters."""
    clean_name = Path(filename).name
    # Strip any directory path separators
    clean_name = re.sub(r"[^\w\s.-]", "_", clean_name).strip()
    if not clean_name:
        clean_name = "image_upload"
    return clean_name

def validate_image_file(filename: str, content: bytes) -> str:
    """
    Validates file extension, size limit, and binary magic bytes.
    Returns detected MIME type if valid, otherwise raises HTTPException.
    """
    # 1. Size check
    if len(content) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds the {settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB upload limit."
        )
    
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # 2. Extension check
    ext = Path(filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Please upload JPG, PNG, WEBP, or BMP."
        )

    # 3. Magic bytes check
    detected_mime = None
    if content.startswith(b"\xff\xd8\xff"):
        detected_mime = "image/jpeg"
    elif content.startswith(b"\x89PNG\r\n\x1a\n"):
        detected_mime = "image/png"
    elif content.startswith(b"RIFF") and len(content) > 12 and content[8:12] == b"WEBP":
        detected_mime = "image/webp"
    elif content.startswith(b"BM"):
        detected_mime = "image/bmp"

    if not detected_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match a valid JPG, PNG, WEBP, or BMP image."
        )

    # Cross check extension matches detected MIME
    expected_mime = EXTENSION_TO_MIME.get(ext)
    if expected_mime and expected_mime != detected_mime:
        # e.g. someone renamed an exe to .jpg
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{ext}' does not match the actual image format ({detected_mime})."
        )

    return detected_mime
