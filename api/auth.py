"""
api/auth.py — авторизация, JWT, зависимости
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel
import os

from db.database import get_db
from db.models import User, UserRole, AuditLog

SECRET_KEY         = os.getenv("SECRET_KEY", "vkr-checker-secret-2025")
ALGORITHM          = "HS256"
TOKEN_EXPIRE_HOURS = 24

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer  = HTTPBearer(auto_error=False)
router  = APIRouter(prefix="/auth", tags=["auth"])


# ── Схемы ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email:     str
    password:  str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email:    str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    role:         str
    full_name:    Optional[str]
    user_id:      int


class UserOut(BaseModel):
    id:         int
    email:      str
    full_name:  Optional[str]
    role:       str
    is_active:  bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Утилиты ───────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def create_token(user_id: int, role: str) -> str:
    payload = {
        "sub":  str(user_id),
        "role": role,
        "exp":  datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ── Зависимости ───────────────────────────────────────────────────────────────

def _get_user_from_token(credentials, db: Session) -> Optional[User]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        return user if user and user.is_active else None
    except JWTError:
        return None


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Возвращает пользователя или None (для гостей)."""
    return _get_user_from_token(credentials, db)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    user = _get_user_from_token(credentials, db)
    if not user:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.admin, UserRole.superadmin):
        raise HTTPException(status_code=403, detail="Требуются права администратора")
    return user


def require_superadmin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.superadmin:
        raise HTTPException(status_code=403, detail="Требуются права суперадминистратора")
    return user


# ── Эндпоинты ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(data: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    user = User(
        email=data.email,
        password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.user,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(AuditLog(user_id=user.id, action="register",
                    ip_address=request.client.host if request.client else None))
    db.commit()

    return TokenResponse(
        access_token=create_token(user.id, user.role.value),
        role=user.role.value,
        full_name=user.full_name,
        user_id=user.id,
    )


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Аккаунт заблокирован")

    db.add(AuditLog(user_id=user.id, action="login",
                    ip_address=request.client.host if request.client else None))
    db.commit()

    return TokenResponse(
        access_token=create_token(user.id, user.role.value),
        role=user.role.value,
        full_name=user.full_name,
        user_id=user.id,
    )


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
