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
    sql_query: Optional[str] = Field(None, description="Consulta SQL de solo lectura a evaluar")
    query: Optional[str] = Field(None, description="Consulta alternativa o en lenguaje natural")
    question: Optional[str] = Field(None, description="Pregunta en lenguaje natural")


def text_to_sql_translator(natural_text: str) -> str:
    """
    Traduce preguntas en lenguaje natural sobre sismos a consultas SELECT seguras sobre curated.
    """
    t = natural_text.lower().strip()
    if t.startswith("select "):
        return natural_text

    if any(k in t for k in ["mayor", "mas fuerte", "más fuerte", "maxima", "máxima", "fuerte"]):
        return "SELECT id, mag, place, time, depth_km FROM curated.earthquakes_curated ORDER BY mag DESC LIMIT 5"
    if "tsunami" in t:
        return "SELECT id, mag, place, time, alert, tsunami FROM curated.earthquakes_curated WHERE tsunami = 1 ORDER BY time DESC LIMIT 20"
    if any(k in t for k in ["region", "región", "lugar", "zonas", "top"]):
        return "SELECT place, COUNT(*) as total_eventos, ROUND(AVG(mag)::numeric, 2) as mag_promedio FROM curated.earthquakes_curated GROUP BY place ORDER BY total_eventos DESC LIMIT 10"
    if any(k in t for k in ["promedio", "media"]):
        return "SELECT ROUND(AVG(mag)::numeric, 2) as magnitud_promedio, ROUND(AVG(depth_km)::numeric, 2) as profundidad_promedio_km, COUNT(*) as total_evaluados FROM curated.earthquakes_curated"
    if any(k in t for k in ["profund", "hondo"]):
        return "SELECT id, mag, place, depth_km, time FROM curated.earthquakes_curated ORDER BY depth_km DESC LIMIT 10"
    if any(k in t for k in ["calidad", "score", "pandera", "cuarentena"]):
        return "SELECT rule_name, passed, total_records, failed_records, error_ratio, evaluated_at FROM curated.quality_results ORDER BY evaluated_at DESC LIMIT 10"
    
    # Por defecto sismos más recientes
    return "SELECT id, mag, place, time, depth_km, alert FROM curated.earthquakes_curated ORDER BY time DESC LIMIT 15"


@router.post("/query")
def execute_guarded_sql(
    request: SQLQueryRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Ejecuta una consulta SQL validada por el motor AST contra la capa curated.
    Permite SQL directo o preguntas en lenguaje natural (Bono Text-to-SQL).
    Bloquea cualquier sentencia que no sea SELECT de solo lectura.
    """
    raw_query = request.sql_query or request.query or request.question
    if not raw_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar 'sql_query', 'query' o 'question'."
        )

    # Si es lenguaje natural o no empieza con SELECT, traducir a SQL seguro
    final_sql = text_to_sql_translator(raw_query)

    try:
        safe_sql = validate_read_only_sql(final_sql, max_limit=100)
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
            "question": raw_query if raw_query != final_sql else None,
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
