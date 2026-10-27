"""
Router para Consultas Analíticas en Lenguaje Natural (Bono Opcional Text-to-SQL).
Permite a usuarios autenticados consultar datos mediante lenguaje natural o SQL seguro.
Aplica validación estricta por AST (sql_guard) garantizando que sea SELECT sobre curated.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.auth.dependencies import get_current_user
from src.database import get_db
from src.services.sql_guard import validate_read_only_sql, SQLSecurityError

router = APIRouter(prefix="/api/ai", tags=["IA Analítica"])


class SQLQueryRequest(BaseModel):
    sql_query: str = Field(..., description="Consulta SQL de solo lectura a evaluar")


class NaturalQueryRequest(BaseModel):
    question: str = Field(..., description="Pregunta en lenguaje natural sobre sismos")


@router.post("/query")
def execute_guarded_sql(
    request: SQLQueryRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Ejecuta una consulta SQL validada por el motor AST contra la capa curated.
    Bloquea cualquier sentencia que no sea SELECT de solo lectura.
    """
    try:
        safe_sql = validate_read_only_sql(request.sql_query, max_limit=100)
    except SQLSecurityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Consulta no autorizada por la política de seguridad: {str(e)}"
        )

    try:
        # Asegurar transacción de solo lectura
        db.execute(text("SET TRANSACTION READ ONLY;"))
        result = db.execute(text(safe_sql))
        columns = list(result.keys())
        rows = [dict(zip(columns, row)) for row in result.fetchall()]
        return {
            "executed_sql": safe_sql,
            "row_count": len(rows),
            "columns": columns,
            "data": rows
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error en la ejecución de la consulta: {str(e)}"
        )
