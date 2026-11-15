import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.models import AuditLog, Operation

logger = logging.getLogger("secureimage.audit")

def log_audit(
    db: Session,
    action: str,
    status: str,
    details: str,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None
) -> Optional[AuditLog]:
    """
    Persists an audit log entry for security and compliance tracking.
    Never raises an uncaught exception to avoid disrupting primary user flows.
    """
    try:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            status=status,
            details=details,
            ip_address=ip_address
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        logger.info(f"AUDIT: [{status}] {action} - User: {user_id} - {details}")
        return entry
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to record audit log: {e}")
        return None

def record_operation(
    db: Session,
    user_id: int,
    operation_type: str,
    original_filename: str,
    encrypted_filename: Optional[str],
    file_size: int,
    sha256: str,
    status: str,
    algorithm: str = "AES-256-GCM + RSA-OAEP",
    error_message: Optional[str] = None
) -> Operation:
    """
    Records an image cryptographic operation (ENCRYPT or DECRYPT) in the operations audit table.
    """
    op = Operation(
        user_id=user_id,
        operation_type=operation_type,
        original_filename=original_filename,
        encrypted_filename=encrypted_filename,
        file_size=file_size,
        sha256=sha256,
        algorithm=algorithm,
        status=status,
        error_message=error_message
    )
    db.add(op)
    db.commit()
    db.refresh(op)
    return op
