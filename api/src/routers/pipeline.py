"""
Router de Estado del Pipeline y Observabilidad de Calidad.
Matriz de Permisos:
- Rol viewer: ve resumen de calidad (score, frescura, última corrida).
- Rol admin: ve detalle completo (desglose de reglas, estado de DAGs y logs).
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.auth.dependencies import require_role
from src.database import get_db
from src.schemas.pipeline import PipelineRun, PipelineStatusResponse

router = APIRouter(prefix="/api/pipeline", tags=["Pipeline"])


@router.get("/status", response_model=PipelineStatusResponse)
def get_pipeline_status(
    current_user: dict = Depends(require_role(["viewer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Retorna el estado de los DAGs y la auditoría de calidad.
    Los datos provienen de curated.pipeline_runs y curated.quality_results.
    La API no consulta las tablas internas de Airflow.
    """
    user_role = current_user.get("role")

    # 1. Obtener última ejecución por DAG
    sql_dags = text("""
        SELECT DISTINCT ON (dag_id)
            id, dag_id, run_id, status, start_time, end_time,
            duration_seconds, records_ingested, records_curated,
            records_quarantined, error_details, updated_at
        FROM curated.pipeline_runs
        ORDER BY dag_id, updated_at DESC;
    """)
    rows_dags = db.execute(sql_dags).fetchall()
    dags_list = [
        PipelineRun(
            id=r[0],
            dag_id=r[1],
            run_id=r[2],
            status=r[3],
            start_time=r[4],
            end_time=r[5],
            duration_seconds=float(r[6]) if r[6] is not None else None,
            records_ingested=int(r[7] or 0),
            records_curated=int(r[8] or 0),
            records_quarantined=int(r[9] or 0),
            error_details=r[10],
            updated_at=r[11]
        )
        for r in rows_dags
    ]

    # 2. Obtener última evaluación de calidad
    sql_quality = text("""
        SELECT quality_score, total_records, records_passed, records_rejected,
               rules_summary, freshness_lag_seconds, evaluated_at
        FROM curated.quality_results
        ORDER BY evaluated_at DESC
        LIMIT 1;
    """)
    q_row = db.execute(sql_quality).fetchone()

    if q_row:
        quality_summary = {
            "quality_score": float(q_row[0]),
            "total_records": int(q_row[1]),
            "records_passed": int(q_row[2]),
            "records_rejected": int(q_row[3]),
            "last_evaluated": q_row[6].isoformat() if q_row[6] else None,
        }
        rules_summary_data = q_row[4]
        freshness_lag = int(q_row[5] or 0)
    else:
        quality_summary = {
            "quality_score": 100.0,
            "total_records": 0,
            "records_passed": 0,
            "records_rejected": 0,
            "last_evaluated": None
        }
        rules_summary_data = {}
        freshness_lag = 0

    # 3. Si el rol es admin, incluir detalle granular de reglas evaluadas
    quality_detail = None
    if user_role == "admin":
        sql_history = text("""
            SELECT dag_run_id, evaluated_at, total_records, records_passed,
                   records_rejected, quality_score, rules_summary
            FROM curated.quality_results
            ORDER BY evaluated_at DESC
            LIMIT 5;
        """)
        h_rows = db.execute(sql_history).fetchall()
        quality_detail = [
            {
                "dag_run_id": hr[0],
                "evaluated_at": hr[1].isoformat(),
                "total": hr[2],
                "passed": hr[3],
                "rejected": hr[4],
                "score": float(hr[5]),
                "rules": hr[6] if isinstance(hr[6], dict) else {}
            }
            for hr in h_rows
        ]

    return PipelineStatusResponse(
        dags=dags_list,
        quality_summary=quality_summary,
        quality_detail=quality_detail,
        freshness_lag_seconds=freshness_lag
    )
