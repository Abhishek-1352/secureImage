import re
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def validate_email_format(v: str) -> str:
    cleaned = v.strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise ValueError("Invalid email address format.")
    return cleaned

# --- Auth Schemas ---
class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return validate_email_format(v)

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match.")
        return v

class UserLogin(BaseModel):
    email: str = Field(..., max_length=255)
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return validate_email_format(v)

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Cryptographic / Image Operations Schemas ---
class EncryptResponse(BaseModel):
    success: bool
    operation_id: int
    file_id: int
    original_filename: str
    encrypted_filename: str
    algorithm: str
    key_protection: str
    sha256: str
    file_size: int
    created_at: str
    download_url: str
    package_data: Optional[Dict[str, Any]] = None

class DecryptResponse(BaseModel):
    success: bool
    operation_id: int
    original_filename: str
    original_mime_type: str
    original_size: int
    original_sha256: str
    recovered_sha256: str
    integrity: str
    decrypted_data_base64: str

class OperationHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    operation_type: str
    original_filename: str
    encrypted_filename: Optional[str] = None
    file_size: int
    sha256: str
    algorithm: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime


# --- Admin Schemas ---
class AdminUserItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    operations_count: int

class AdminUserStatusUpdate(BaseModel):
    is_active: bool

class AuditLogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    status: str
    ip_address: Optional[str] = None
    details: str
    created_at: datetime

class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    total_encryptions: int
    total_decryptions: int
    failed_operations: int
    recent_operations: List[OperationHistoryResponse]
    operations_ratio: Dict[str, int]
    daily_chart: List[Dict[str, Any]]
