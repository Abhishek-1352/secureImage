import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "SecureImage"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'secureimage.db'}"
    
    # JWT & Auth
    JWT_SECRET: str = "secureimage-secret-key-super-secure-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Default Admin Seed
    ADMIN_NAME: str = "Security Administrator"
    ADMIN_EMAIL: str = "admin@secureimage.local"
    ADMIN_PASSWORD: str = "Admin@123456"
    
    # Cryptography
    RSA_KEY_SIZE: int = 2048
    KEYS_DIR: Path = BASE_DIR / "keys"
    PRIVATE_KEY_PATH: Path = BASE_DIR / "keys" / "private_key.pem"
    PUBLIC_KEY_PATH: Path = BASE_DIR / "keys" / "public_key.pem"
    
    # Storage & Upload limits
    STORAGE_DIR: Path = BASE_DIR / "storage" / "encrypted"
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    
    # Allowed MIME types & extensions
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

settings = Settings()

# Ensure required directories exist
settings.KEYS_DIR.mkdir(parents=True, exist_ok=True)
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
