"""
Router de Autenticación y Emisión de JWT.
Protegido con Rate Limiting para mitigar ataques de fuerza bruta.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.auth.dependencies import get_current_user
from src.auth.jwt import create_access_token, verify_password
from src.database import get_db
from src.schemas.auth import LoginRequest, TokenResponse, UserResponse

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Inicio de sesión para usuarios de la plataforma (viewer o admin).
    Devuelve un token JWT firmado.
    """
    user_row = db.execute(
        text("SELECT id, username, hashed_password, role FROM curated.users WHERE username = :user"),
        {"user": login_data.username}
    ).fetchone()

    if not user_row or not verify_password(login_data.password, user_row[2]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas: usuario o contraseña inválidos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id, username, _, role = user_row
    token_payload = {"sub": username, "user_id": user_id, "role": role}
    access_token = create_access_token(data=token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=role,
        username=username
    )


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: dict = Depends(get_current_user)):
    """Retorna los datos del usuario autenticado."""
    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        role=current_user["role"],
        created_at=datetime.utcnow()
    )
