import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="USER")  # "USER" or "ADMIN"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    operations = relationship("Operation", back_populates="user", cascade="all, delete-orphan")
    encrypted_files = relationship("EncryptedFile", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")


class Operation(Base):
    __tablename__ = "operations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    operation_type = Column(String(20), nullable=False)  # "ENCRYPT", "DECRYPT"
    original_filename = Column(String(255), nullable=False)
    encrypted_filename = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False)
    algorithm = Column(String(100), default="AES-256-GCM + RSA-OAEP", nullable=False)
    status = Column(String(20), nullable=False)  # "SUCCESS", "FAILED"
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="operations")


class EncryptedFile(Base):
    __tablename__ = "encrypted_files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    package_filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    sha256 = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="encrypted_files")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(50), nullable=False)  # e.g., USER_LOGIN, IMAGE_ENCRYPTION, etc.
    status = Column(String(20), nullable=False)  # "SUCCESS", "FAILED"
    ip_address = Column(String(100), nullable=True)
    details = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="audit_logs")
