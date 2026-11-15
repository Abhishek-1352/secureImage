import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.models import User
from app.utils.hashing import hash_password
from app.services.crypto_service import crypto_service
from app.routes import auth, images, admin

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("secureimage")

def init_db_and_seed():
    """Initializes database schema and ensures default admin account exists."""
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    # Ensure cryptographic RSA keys exist
    crypto_service.ensure_rsa_keys()

    # Seed initial admin account if not present
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == settings.ADMIN_EMAIL.lower()).first()
        if not admin_user:
            logger.info(f"Seeding default administrator account ({settings.ADMIN_EMAIL})...")
            new_admin = User(
                full_name=settings.ADMIN_NAME,
                email=settings.ADMIN_EMAIL.lower(),
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                role="ADMIN",
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            logger.info("Default administrator account successfully created.")
    except Exception as e:
        logger.error(f"Error during admin seeding: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db_and_seed()
    yield
    # Shutdown
    logger.info("SecureImage backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Hybrid Cryptographic System for Secure Image Encryption and Decryption",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global unhandled exception handler to ensure sensitive stack traces are never exposed
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal cryptographic or server error occurred. Please try again."}
    )

# Health endpoint
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "crypto": {
            "algorithm": "AES-256-GCM",
            "key_protection": "RSA-OAEP-SHA256",
            "fingerprint": "SHA-256"
        }
    }

# Include routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(images.router, prefix=settings.API_PREFIX)
app.include_router(admin.router, prefix=settings.API_PREFIX)
