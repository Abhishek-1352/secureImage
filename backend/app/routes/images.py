import base64
import json
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, Operation, EncryptedFile
from app.schemas import EncryptResponse, DecryptResponse, OperationHistoryResponse
from app.services.auth_service import get_current_user
from app.services.crypto_service import crypto_service
from app.services.audit_service import log_audit, record_operation
from app.utils.file_validation import sanitize_filename, validate_image_file

router = APIRouter(prefix="/images", tags=["Image Cryptography"])

@router.post("/encrypt", response_model=EncryptResponse)
async def encrypt_image(
    file: UploadFile = File(...),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Encrypts an uploaded image using AES-256-GCM and wraps the AES session key
    using RSA-OAEP. Outputs a secure .simg package.
    """
    client_ip = request.client.host if request and request.client else "unknown"
    safe_filename = sanitize_filename(file.filename or "upload.jpg")

    # Read binary content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not read uploaded file: {str(e)}"
        )

    # Validate image format, size, and magic bytes
    detected_mime = validate_image_file(safe_filename, content)

    # Perform Hybrid Encryption
    try:
        package = crypto_service.encrypt_image(content, safe_filename, detected_mime)
    except Exception as e:
        log_audit(
            db, action="IMAGE_ENCRYPTION", status="FAILED",
            details=f"Encryption error for file '{safe_filename}': {str(e)}",
            user_id=current_user.id, ip_address=client_ip
        )
        record_operation(
            db, user_id=current_user.id, operation_type="ENCRYPT",
            original_filename=safe_filename, encrypted_filename=None,
            file_size=len(content), sha256="UNKNOWN", status="FAILED",
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform hybrid encryption."
        )

    # Persist the .simg package to storage
    package_filename = f"{Path(safe_filename).stem}_{uuid.uuid4().hex[:8]}.simg"
    package_path = settings.STORAGE_DIR / package_filename
    with open(package_path, "w", encoding="utf-8") as f:
        json.dump(package, f, indent=2)

    # Record in database
    enc_file = EncryptedFile(
        user_id=current_user.id,
        original_filename=safe_filename,
        package_filename=package_filename,
        storage_path=str(package_path),
        sha256=package["sha256"]
    )
    db.add(enc_file)
    db.commit()
    db.refresh(enc_file)

    # Record operation
    op = record_operation(
        db, user_id=current_user.id, operation_type="ENCRYPT",
        original_filename=safe_filename, encrypted_filename=package_filename,
        file_size=len(content), sha256=package["sha256"], status="SUCCESS"
    )

    # Audit log
    log_audit(
        db, action="IMAGE_ENCRYPTION", status="SUCCESS",
        details=f"Encrypted '{safe_filename}' ({len(content)} bytes) -> '{package_filename}'. SHA-256: {package['sha256'][:16]}...",
        user_id=current_user.id, ip_address=client_ip
    )

    return EncryptResponse(
        success=True,
        operation_id=op.id,
        file_id=enc_file.id,
        original_filename=safe_filename,
        encrypted_filename=package_filename,
        algorithm=package["algorithm"],
        key_protection=package["key_protection"],
        sha256=package["sha256"],
        file_size=len(content),
        created_at=package["created_at"],
        download_url=f"/images/{enc_file.id}/download",
        package_data=package
    )

@router.get("/{file_id}/download")
def download_encrypted_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Downloads a stored .simg package for the owner user or an admin."""
    enc_file = db.query(EncryptedFile).filter(EncryptedFile.id == file_id).first()
    if not enc_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encrypted file not found.")

    if current_user.role != "ADMIN" and enc_file.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    path = Path(enc_file.storage_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File on disk not found.")

    return FileResponse(
        path=str(path),
        media_type="application/json",
        filename=enc_file.package_filename
    )

@router.post("/decrypt", response_model=DecryptResponse)
async def decrypt_image(
    file: UploadFile = File(...),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accepts an uploaded .simg package, recovers the AES session key using RSA-OAEP,
    authenticates and decrypts the ciphertext using AES-256-GCM, and validates SHA-256 integrity.
    """
    client_ip = request.client.host if request and request.client else "unknown"
    safe_pkg_name = sanitize_filename(file.filename or "package.simg")

    # Read and parse package
    try:
        raw_bytes = await file.read()
        package_data = json.loads(raw_bytes.decode("utf-8"))
    except Exception as e:
        log_audit(
            db, action="IMAGE_DECRYPTION", status="FAILED",
            details=f"Malformed or non-JSON package: {safe_pkg_name}",
            user_id=current_user.id, ip_address=client_ip
        )
        record_operation(
            db, user_id=current_user.id, operation_type="DECRYPT",
            original_filename=safe_pkg_name, encrypted_filename=safe_pkg_name,
            file_size=len(raw_bytes) if 'raw_bytes' in locals() else 0,
            sha256="UNKNOWN", status="FAILED",
            error_message="Invalid package format. Must be a valid .simg JSON container."
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid package format. Must be a valid .simg JSON container."
        )

    # Perform Decryption & Integrity Verification
    original_filename = package_data.get("original_filename", "recovered_image")
    expected_sha256 = package_data.get("sha256", "UNKNOWN")
    try:
        decrypted_bytes, metadata = crypto_service.decrypt_package(package_data)
    except ValueError as e:
        # Cryptographic failure (tampered ciphertext, invalid tag, corrupted key, mismatch)
        err_msg = str(e)
        log_audit(
            db, action="IMAGE_DECRYPTION", status="FAILED",
            details=f"Decryption failed for package '{safe_pkg_name}': {err_msg}",
            user_id=current_user.id, ip_address=client_ip
        )
        record_operation(
            db, user_id=current_user.id, operation_type="DECRYPT",
            original_filename=original_filename, encrypted_filename=safe_pkg_name,
            file_size=len(raw_bytes), sha256=expected_sha256,
            status="FAILED", error_message=err_msg
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )
    except Exception as e:
        err_msg = f"Unexpected decryption error: {str(e)}"
        log_audit(
            db, action="IMAGE_DECRYPTION", status="FAILED",
            details=err_msg, user_id=current_user.id, ip_address=client_ip
        )
        record_operation(
            db, user_id=current_user.id, operation_type="DECRYPT",
            original_filename=original_filename, encrypted_filename=safe_pkg_name,
            file_size=len(raw_bytes), sha256=expected_sha256,
            status="FAILED", error_message=err_msg
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Decryption failed. The encrypted package may have been modified or corrupted."
        )

    # Record successful operation
    op = record_operation(
        db, user_id=current_user.id, operation_type="DECRYPT",
        original_filename=metadata["original_filename"],
        encrypted_filename=safe_pkg_name,
        file_size=len(decrypted_bytes),
        sha256=metadata["recovered_sha256"],
        status="SUCCESS"
    )

    log_audit(
        db, action="IMAGE_DECRYPTION", status="SUCCESS",
        details=f"Decrypted '{metadata['original_filename']}' ({len(decrypted_bytes)} bytes). Integrity: VERIFIED.",
        user_id=current_user.id, ip_address=client_ip
    )

    return DecryptResponse(
        success=True,
        operation_id=op.id,
        original_filename=metadata["original_filename"],
        original_mime_type=metadata["original_mime_type"],
        original_size=metadata["original_size"],
        original_sha256=metadata["original_sha256"],
        recovered_sha256=metadata["recovered_sha256"],
        integrity=metadata["integrity"],
        decrypted_data_base64=base64.b64encode(decrypted_bytes).decode("utf-8")
    )

@router.get("/history", response_model=List[OperationHistoryResponse])
def get_user_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves the authenticated user's personal cryptographic operation history."""
    operations = (
        db.query(Operation)
        .filter(Operation.user_id == current_user.id)
        .order_by(Operation.created_at.desc())
        .limit(100)
        .all()
    )
    return operations
