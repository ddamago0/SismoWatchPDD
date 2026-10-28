"""
Router para Consultas Analíticas en Lenguaje Natural y Asistente SismoBot (Bono Text-to-SQL + AST Guard).
Permite a usuarios autenticados consultar datos mediante lenguaje natural o SQL seguro.
Aplica validación estricta por AST (sql_guard) garantizando que sea SELECT sobre curated.
Incorpora sanitización OWASP LLM01, memoria conversacional e inyección de hechos en vivo.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.auth.dependencies import get_current_user
from src.database import get_db
from src.services.ai_agent import sismo_agent

router = APIRouter(tags=["IA Analítica"])


class SQLQueryRequest(BaseModel):
    message: Optional[str] = Field(None, description="Mensaje en lenguaje natural o pregunta al asistente")
    question: Optional[str] = Field(None, description="Pregunta en lenguaje natural")
    query: Optional[str] = Field(None, description="Consulta alternativa")
    sql_query: Optional[str] = Field(None, description="Consulta SQL directa de solo lectura")
    history: Optional[List[Dict[str, str]]] = Field(None, description="Historial de mensajes previos [{role, content}]")


@router.post("/api/ai/query", summary="Consulta asistida con SismoBot")
@router.post("/api/ai/chat", summary="Chatbot conversacional con datos en vivo")
@router.post("/api/chat", summary="Alias directo para SismoBot Chat")
def execute_guarded_sql(
    request: SQLQueryRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Ejecuta una consulta asistida por SismoBot con validación AST, sanitización OWASP y generación de narrativa.
    Acepta lenguaje natural o SQL directo. Bloquea cualquier operación no autorizada.
    """
    user_query = request.message or request.question or request.query or request.sql_query
    if not user_query or not user_query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar un mensaje, pregunta o consulta SQL."
        )

    try:
        response = sismo_agent.process_query(user_query, db, history=request.history)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fallo al procesar la consulta con el asistente analítico: {str(e)}"
        )
