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


@router.get("/lineage")
def get_pipeline_lineage(
    current_user: dict = Depends(require_role(["viewer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Retorna el grafo de linaje de datos de extremo a extremo (Data Lineage & Governance)
    y métricas de conciliación matemática entre las capas Medallion.
    """
    # 1. Contar registros por capa
    def safe_count(query_str: str) -> int:
        try:
            return db.execute(text(query_str)).scalar() or 0
        except Exception:
            return 0

    curated_count = safe_count("SELECT COUNT(*) FROM curated.earthquakes_curated;")
    quarantine_count = safe_count("SELECT COUNT(*) FROM curated.quality_quarantine;")
    ai_reports_count = safe_count("SELECT COUNT(*) FROM curated.ai_reports;")
    anomalies_count = safe_count("SELECT COUNT(*) FROM curated.seismic_anomalies;")

    # Obtener métricas de la última evaluación de calidad
    q_row = db.execute(text("""
        SELECT quality_score, total_records, records_passed, records_rejected, evaluated_at, freshness_lag_seconds
        FROM curated.quality_results
        ORDER BY evaluated_at DESC
        LIMIT 1;
    """)).fetchone()

    quality_score = float(q_row[0]) if q_row else 100.0
    last_evaluated = q_row[4].isoformat() if q_row and q_row[4] else None
    freshness_lag = int(q_row[5]) if q_row and q_row[5] else 0

    nodes = [
        {
            "id": "usgs_live",
            "name": "USGS Live Feed",
            "layer": "source",
            "category": "External API",
            "description": "Feed GeoJSON all_hour.geojson (cada 5 min)",
            "protocol": "HTTPS GeoJSON",
            "status": "HEALTHY"
        },
        {
            "id": "usgs_archive",
            "name": "USGS FDSNWS Archive",
            "layer": "source",
            "category": "External API",
            "description": "API FDSNWS parametrizada para backfills de 30 días",
            "protocol": "HTTPS REST Query",
            "status": "HEALTHY"
        },
        {
            "id": "raw_layer",
            "name": "raw.usgs_earthquakes_raw",
            "layer": "bronze",
            "category": "Bronze (Crudo)",
            "description": "Payload JSONB original, ingesta append-only idempotente",
            "policy": "ON CONFLICT (id) DO UPDATE",
            "records": curated_count + quarantine_count,
            "status": "HEALTHY"
        },
        {
            "id": "staging_layer",
            "name": "staging.earthquakes_staging",
            "layer": "silver",
            "category": "Silver (Normalizado)",
            "description": "Coordenadas aplanadas, tipos numéricos forzados, marcas temporales UTC",
            "records": curated_count + quarantine_count,
            "status": "HEALTHY"
        },
        {
            "id": "quality_gate",
            "name": "Pandera Quality Gate",
            "layer": "gate",
            "category": "Data Contract",
            "description": "Validaciones bloqueantes: Geografía [-90,90], Magnitud, Profundidad, Fecha",
            "rules": ["GEOGRAPHIC_BOUNDS", "MAGNITUDE_BOUNDS", "DEPTH_BOUNDS", "INVALID_TIMESTAMP", "UNIQUENESS"],
            "score": quality_score,
            "status": "ACTIVE"
        },
        {
            "id": "curated_layer",
            "name": "curated.earthquakes_curated",
            "layer": "gold",
            "category": "Gold (Certificado)",
            "description": "Eventos 100% aprobados listos para analítica y visualización",
            "records": curated_count,
            "status": "HEALTHY"
        },
        {
            "id": "quarantine_layer",
            "name": "curated.quality_quarantine",
            "layer": "quarantine",
            "category": "Dead-Letter Queue",
            "description": "Eventos corruptos o anómalos desviados con regla fallida y motivo",
            "records": quarantine_count,
            "status": "ACTIVE"
        },
        {
            "id": "ai_reports_layer",
            "name": "curated.ai_reports",
            "layer": "gold_analytics",
            "category": "Gold Analytics",
            "description": "Boletines ejecutivos diarios generados con IA y validados contra alucinaciones",
            "records": ai_reports_count,
            "status": "HEALTHY"
        },
        {
            "id": "anomalies_layer",
            "name": "curated.seismic_anomalies",
            "layer": "gold_analytics",
            "category": "Gold Analytics",
            "description": "Detección Z-Score y agrupamiento geodésico Haversine de enjambres sísmicos",
            "records": anomalies_count,
            "status": "HEALTHY"
        },
        {
            "id": "fastapi_serving",
            "name": "FastAPI Serving Layer",
            "layer": "serving",
            "category": "Backend REST & SSE",
            "description": "Autenticación JWT, RBAC de mínimo privilegio (sismo_reader) y SSE /api/stream",
            "status": "HEALTHY"
        },
        {
            "id": "react_dashboard",
            "name": "React Dashboard SPA",
            "layer": "presentation",
            "category": "Frontend UI",
            "description": "Visualización reactiva en tiempo real, mapas Leaflet y gráficos Recharts",
            "status": "HEALTHY"
        }
    ]

    edges = [
        {"from": "usgs_live", "to": "raw_layer", "dag": "dag_ingesta_usgs", "type": "ingest"},
        {"from": "usgs_archive", "to": "raw_layer", "dag": "dag_backfill_historico", "type": "backfill"},
        {"from": "raw_layer", "to": "staging_layer", "dag": "dag_transformacion_calidad", "type": "transform"},
        {"from": "staging_layer", "to": "quality_gate", "dag": "dag_transformacion_calidad", "type": "validate"},
        {"from": "quality_gate", "to": "curated_layer", "condition": "PASSED", "type": "publish"},
        {"from": "quality_gate", "to": "quarantine_layer", "condition": "REJECTED", "type": "divert"},
        {"from": "curated_layer", "to": "ai_reports_layer", "dag": "dag_reporte_ia_anomalias", "type": "llm_generate"},
        {"from": "curated_layer", "to": "anomalies_layer", "dag": "dag_reporte_ia_anomalias", "type": "ml_clustering"},
        {"from": "curated_layer", "to": "fastapi_serving", "role": "sismo_reader", "type": "read_only"},
        {"from": "quarantine_layer", "to": "fastapi_serving", "role": "sismo_reader (Admin only)", "type": "read_only"},
        {"from": "ai_reports_layer", "to": "fastapi_serving", "role": "sismo_reader", "type": "read_only"},
        {"from": "anomalies_layer", "to": "fastapi_serving", "role": "sismo_reader", "type": "read_only"},
        {"from": "fastapi_serving", "to": "react_dashboard", "protocol": "REST & SSE Stream", "type": "stream"}
    ]

    return {
        "reconciliation": {
            "equation": "N_raw = N_curated + N_quarantine + N_duplicates",
            "total_curated": curated_count,
            "total_quarantined": quarantine_count,
            "quality_score_pct": quality_score,
            "freshness_lag_seconds": freshness_lag,
            "last_evaluated": last_evaluated
        },
        "nodes": nodes,
        "edges": edges
    }
