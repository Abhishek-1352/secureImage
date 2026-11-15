from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserRegister, UserLogin, TokenResponse, UserResponse
from app.utils.hashing import hash_password, verify_password
from app.services.auth_service import create_access_token, get_current_user
from app.services.audit_service import log_audit

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, request: Request, db: Session = Depends(get_db)):
    """Registers a new standard user account."""
    client_ip = request.client.host if request.client else "unknown"
    normalized_email = user_data.email.lower().strip()

    # Check for existing email
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        log_audit(
            db, action="USER_REGISTER", status="FAILED",
            details=f"Registration attempt with existing email: {normalized_email}",
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Create user
    new_user = User(
        full_name=user_data.full_name.strip(),
        email=normalized_email,
        password_hash=hash_password(user_data.password),
        role="USER",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit(
        db, action="USER_REGISTER", status="SUCCESS",
        details=f"User registered successfully: {new_user.email} (ID: {new_user.id})",
        user_id=new_user.id, ip_address=client_ip
    )

    return new_user

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Authenticates user and returns JWT access token."""
    client_ip = request.client.host if request.client else "unknown"
    normalized_email = login_data.email.lower().strip()

    user = db.query(User).filter(User.email == normalized_email).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        log_audit(
            db, action="USER_LOGIN", status="FAILED",
            details=f"Failed login attempt for email: {normalized_email}",
            user_id=user.id if user else None, ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        log_audit(
            db, action="USER_LOGIN", status="FAILED",
            details=f"Deactivated user attempted login: {normalized_email}",
            user_id=user.id, ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Contact the administrator."
        )

    token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )

    log_audit(
        db, action="USER_LOGIN", status="SUCCESS",
        details=f"User logged in successfully: {user.email}",
        user_id=user.id, ip_address=client_ip
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile."""
    return current_user
