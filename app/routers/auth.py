from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import LoginRequest, TokenResponse, UserRead

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah.",
        )

    # Best-effort migration: plaintext -> PBKDF2 hash.
    if user.password and not user.password.startswith("pbkdf2_sha256$") and payload.password == user.password:
        user.password = hash_password(payload.password)
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)

