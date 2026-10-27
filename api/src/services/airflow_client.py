"""
Cliente HTTP para interactuar de forma segura con la API REST de Apache Airflow.
Permite a usuarios administradores disparar backfills históricos y regenerar reportes de IA.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, Optional
import requests
from fastapi import HTTPException, status
from src.config import settings

logger = logging.getLogger(__name__)


def trigger_airflow_dag(dag_id: str, conf: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Dispara una ejecución de DAG en Airflow mediante su API REST v1."""
    url = f"{settings.AIRFLOW_API_URL}/dags/{dag_id}/dagRuns"
    auth = (settings.AIRFLOW_ADMIN_USER, settings.AIRFLOW_ADMIN_PASSWORD)
    run_id = f"api_trigger_{int(datetime.now(timezone.utc).timestamp())}"
    payload = {
        "dag_run_id": run_id,
        "conf": conf or {}
    }

    try:
        response = requests.post(url, json=payload, auth=auth, timeout=10)
        if response.status_code in (200, 201):
            logger.info("DAG '%s' disparado exitosamente con run_id: %s", dag_id, run_id)
            return {"status": "triggered", "dag_id": dag_id, "dag_run_id": run_id}
        else:
            logger.error("Error al disparar DAG '%s' en Airflow (%d): %s", dag_id, response.status_code, response.text)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Airflow API respondió con error ({response.status_code}): {response.text[:200]}"
            )
    except requests.exceptions.RequestException as e:
        logger.error("No se pudo conectar con Airflow REST API: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Airflow API no disponible temporalmente: {str(e)}"
        )
