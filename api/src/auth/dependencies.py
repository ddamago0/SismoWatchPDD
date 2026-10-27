"""
Dependencias de seguridad y Control de Acceso Basado en Roles (RBAC).
Garantiza que:
- Sin token -> HTTP 401 Unauthorized
- Rol viewer intentando acción admin -> HTTP 403 Forbidden
- Soporte para paso de token por Header Bearer o Query Parameter (?token=...) para SSE.
"""

from typing import Callable, Optional
from fastapi import Depends, HTTPException, Query, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session
from src.auth.jwt import decode_access_token
from src.database import get_db

security_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    token_query: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db)
) -> dict:
    """
    Extrae y valida el usuario actual a partir del token Bearer o parámetro query.
    Si el token es inválido o falta, retorna HTTP 401 Unauthorized.
    """
    token = None
    if credentials:
        token = credentials.credentials
    elif token_query:
        token = token_query

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticación requerida. Proporcione un token Bearer válido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username: str = payload.get("sub")
    role: str = payload.get("role")
    if not username or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Carga útil del token incompleta.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validar que el usuario exista en curated.users
    user_row = db.execute(
        text("SELECT id, username, role FROM curated.users WHERE username = :user"),
        {"user": username}
    ).fetchone()

    if not user_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no registrado en la plataforma.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {"id": user_row[0], "username": user_row[1], "role": user_row[2]}


def require_role(allowed_roles: list[str]) -> Callable:
    """
    Factoría de dependencias para validar roles requeridos.
    Si el usuario no tiene uno de los roles permitidos, lanza HTTP 403 Forbidden.
    """
    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado: Se requiere uno de los siguientes roles: {allowed_roles}."
            )
        return current_user
    return role_checker
