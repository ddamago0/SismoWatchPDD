"""
Módulo de alertas y callbacks de observabilidad para Airflow.
Registra fallos en curated.pipeline_runs y emite notificaciones estructuradas
(webhook/slack/telegram o log crítico).
"""

import json
import logging
import os
import requests
from datetime import datetime, timezone
from airflow.include.db_utils import record_pipeline_run

logger = logging.getLogger(__name__)


def pipeline_failure_callback(context: dict) -> None:
    """
    Callback ejecutado automáticamente ante fallos en cualquier tarea o DAG.
    1. Registra el fallo con detalle en curated.pipeline_runs para la API.
    2. Envía notificación webhook si ALERT_WEBHOOK_URL está configurada.
    """
    dag_id = context.get("dag", {}).dag_id if hasattr(context.get("dag"), "dag_id") else "unknown_dag"
    task_instance = context.get("task_instance")
    task_id = task_instance.task_id if task_instance else "unknown_task"
    run_id = context.get("run_id", f"error_{int(datetime.now(timezone.utc).timestamp())}")
    exception = context.get("exception", "Error desconocido")
    start_time = task_instance.start_date if task_instance and task_instance.start_date else datetime.now(timezone.utc)
    end_time = datetime.now(timezone.utc)
    duration = (end_time - start_time).total_seconds() if start_time else 0.0

    error_msg = f"Fallo en DAG '{dag_id}' (tarea: '{task_id}'): {str(exception)}"
    logger.error("🚨 [ALERTA DE PIPELINE] %s", error_msg)

    # Registrar en base de datos curated.pipeline_runs
    try:
        record_pipeline_run(
            dag_id=dag_id,
            run_id=run_id,
            status="FAILED",
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration,
            error_details=error_msg
        )
    except Exception as db_err:
        logger.error("No se pudo registrar el fallo en pipeline_runs: %s", str(db_err))

    # Notificar por Webhook si existe variable
    webhook_url = os.getenv("ALERT_WEBHOOK_URL")
    if webhook_url:
        try:
            payload = {
                "text": f"🚨 *SismoWatch Alert*: {error_msg}",
                "dag_id": dag_id,
                "task_id": task_id,
                "run_id": run_id,
                "timestamp": end_time.isoformat()
            }
            requests.post(webhook_url, json=payload, timeout=5)
        except Exception as net_err:
            logger.warning("No se pudo enviar notificación webhook: %s", str(net_err))
