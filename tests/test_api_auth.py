"""
Pruebas de Autenticación JWT, Control de Acceso Basado en Roles (RBAC) y AST SQL Guard.
"""

import sys
from pathlib import Path
import httpx
import pytest

repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(repo_root / "api"))

from src.auth.jwt import create_access_token, decode_access_token
from src.services.sql_guard import validate_read_only_sql, SQLSecurityError

API_BASE = "http://localhost:8000"


def test_jwt_token_lifecycle():
    """Valida la generación, firma y decodificación de tokens JWT."""
    payload = {"sub": "test_user", "role": "viewer"}
    token = create_access_token(payload)
    assert token is not None
    assert isinstance(token, str)

    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "test_user"
    assert decoded["role"] == "viewer"
    assert "exp" in decoded


def test_jwt_invalid_token():
    """Valida que un token adulterado sea rechazado."""
    assert decode_access_token("token_invalido_totalmente_falso") is None


def test_sql_guard_ast_select_allowed():
    """Valida que consultas SELECT sean sanitizadas y acotadas con LIMIT 100."""
    query = "SELECT id, mag, place FROM curated.earthquakes_curated"
    safe_sql = validate_read_only_sql(query, max_limit=100)
    assert safe_sql.startswith("SELECT * FROM (")
    assert "LIMIT 100;" in safe_sql


def test_sql_guard_ast_dml_blocked():
    """Valida que sentencias DML/DDL sean bloqueadas por el guardián AST."""
    dangerous_queries = [
        "DROP TABLE curated.earthquakes_curated",
        "DELETE FROM curated.earthquakes_curated WHERE mag < 3",
        "UPDATE curated.earthquakes_curated SET mag = 9.9",
        "TRUNCATE curated.earthquakes_curated",
        "ALTER TABLE curated.earthquakes_curated ADD COLUMN hacked text",
    ]
    for q in dangerous_queries:
        with pytest.raises(SQLSecurityError):
            validate_read_only_sql(q)


def test_api_anonymous_request_rejected():
    """Endpoint protegido sin token debe retornar HTTP 401 Unauthorized."""
    with httpx.Client(base_url=API_BASE) as client:
        res = client.get("/api/kpis")
        assert res.status_code == 401


def test_api_rbac_quarantine_forbidden_for_viewer():
    """Rol viewer debe recibir estrictamente HTTP 403 Forbidden al intentar acceder a cuarentena."""
    with httpx.Client(base_url=API_BASE) as client:
        # 1. Login como viewer
        login_res = client.post(
            "/auth/login",
            json={"username": "viewer", "password": "-D5x4648Zh-EJsYBqhAp74-b6wk"}
        )
        assert login_res.status_code == 200
        viewer_token = login_res.json()["access_token"]

        # 2. Intentar ver cuarentena
        quarantine_res = client.get(
            "/api/quality/quarantine",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert quarantine_res.status_code == 403
        assert "Acceso denegado" in quarantine_res.json()["detail"]


def test_api_rbac_quarantine_allowed_for_admin():
    """Rol admin debe recibir HTTP 200 OK y listar sismos en cuarentena."""
    with httpx.Client(base_url=API_BASE) as client:
        # 1. Login como admin
        login_res = client.post(
            "/auth/login",
            json={"username": "admin", "password": "9qwtK_dVjef-ex5qgrHnlJRr6u8"}
        )
        assert login_res.status_code == 200
        admin_token = login_res.json()["access_token"]

        # 2. Consultar cuarentena
        quarantine_res = client.get(
            "/api/quality/quarantine",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert quarantine_res.status_code == 200
        assert isinstance(quarantine_res.json(), list)
