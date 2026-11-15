import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.models import User
from app.utils.hashing import hash_password
from app.services.crypto_service import crypto_service

def seed():
    print("=" * 60)
    print("SecureImage -- Database & Admin Account Initializer")
    print("=" * 60)

    # 1. Initialize tables
    print("[1/3] Initializing SQLite database schema...")
    Base.metadata.create_all(bind=engine)
    print("      [OK] Database tables verified.")

    # 2. Ensure RSA keys
    print("[2/3] Checking RSA cryptographic keys...")
    crypto_service.ensure_rsa_keys()
    print(f"      [OK] Private Key: {settings.PRIVATE_KEY_PATH}")
    print(f"      [OK] Public Key:  {settings.PUBLIC_KEY_PATH}")

    # 3. Create or reset admin
    print("[3/3] Checking administrator account...")
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL.lower()).first()
        if admin:
            print(f"      [OK] Administrator already exists: {admin.email}")
        else:
            admin = User(
                full_name=settings.ADMIN_NAME,
                email=settings.ADMIN_EMAIL.lower(),
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                role="ADMIN",
                is_active=True
            )
            db.add(admin)
            db.commit()
            print(f"      [OK] Successfully created Administrator: {admin.email}")
            print(f"      [OK] Default Password: {settings.ADMIN_PASSWORD}")
    finally:
        db.close()

    print("=" * 60)
    print("Initialization Complete! Ready for demonstration.")
    print("=" * 60)

if __name__ == "__main__":
    seed()
