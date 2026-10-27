"""
Router de Acciones Administrativas.
RESTRICCIÓN DE SEGURIDAD:
Acceso EXCLUSIVO para rol 'admin'.
Dispara flujos en Apache Airflow a través de su API REST.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from src.auth.dependencies import require_role
from src.services.airflow_client import trigger_airflow_dag

router = APIRouter(prefix="/api/admin", tags=["Administración"])


class BackfillRequest(BaseModel):
    start_date: str = Field(..., description="Fecha inicial YYYY-MM-DD")
    end_date: str = Field(..., description="Fecha final YYYY-MM-DD")
    min_magnitude: float = Field(2.5, ge=0.0, le=10.0, description="Magnitud mínima")


@router.post("/backfill")
def launch_backfill(
    request: BackfillRequest,
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Dispara el DAG de backfill histórico en Airflow para el rango solicitado.
    Solo ejecutable por administradores.
    """
    conf = {
        "start_date": request.start_date,
        "end_date": request.end_date,
        "min_magnitude": request.min_magnitude
    }
    result = trigger_airflow_dag("dag_backfill_historico", conf=conf)
    return {
        "message": f"Backfill iniciado exitosamente para el rango {request.start_date} a {request.end_date}",
        "details": result
    }


@router.post("/reports/regenerate")
def regenerate_ai_report(
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Dispara la re-ejecución inmediata del DAG de reporte ejecutivo con IA.
    Solo ejecutable por administradores.
    """
    result = trigger_airflow_dag("dag_reporte_ia_anomalias")
    return {
        "message": "Generación del reporte de IA iniciada en Airflow.",
        "details": result
    }
