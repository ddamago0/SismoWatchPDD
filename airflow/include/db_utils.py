"""
Utilidades de base de datos para los DAGs de Airflow.
Implementa conexiones seguras por rol de mínimo privilegio y operaciones
idempotentes (UPSERT) en las tres capas Medallion (raw, staging, curated).
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple
import psycopg2
from psycopg2.extras import execute_values, Json

logger = logging.getLogger(__name__)


def get_db_connection(role: str = "transform") -> psycopg2.extensions.connection:
    """
    Retorna una conexión a PostgreSQL con las credenciales del rol solicitado:
    - 'ingest': usuario con permisos de escritura/lectura en raw
    - 'transform': usuario con permisos entre capas raw, staging y curated
    - 'read': usuario de solo lectura en curated (usado por la API)
    - 'admin': superusuario de postgres (para operaciones de setup/metadata)
    """
    host = os.getenv("POSTGRES_HOST", "postgres")
    port = int(os.getenv("POSTGRES_PORT", "5432"))
    db = os.getenv("POSTGRES_DB", "sismowatch")

    if role == "ingest":
        user = os.getenv("INGEST_USER", "sismo_ingest")
        password = os.getenv("INGEST_PASSWORD", "")
    elif role == "transform":
        user = os.getenv("TRANSFORM_USER", "sismo_transform")
        password = os.getenv("TRANSFORM_PASSWORD", "")
    elif role == "read":
        user = os.getenv("READ_USER", "sismo_reader")
        password = os.getenv("READ_PASSWORD", "")
    elif role == "admin":
        user = os.getenv("POSTGRES_USER", "postgres")
        password = os.getenv("POSTGRES_PASSWORD", "")
    else:
        raise ValueError(f"Rol desconocido: {role}")

    return psycopg2.connect(
        host=host,
        port=port,
        dbname=db,
        user=user,
        password=password,
        connect_timeout=10
    )


def insert_raw_events(features: List[Dict[str, Any]], source_feed: str, batch_id: str) -> int:
    """
    Inserta eventos crudos de GeoJSON en raw.usgs_earthquakes_raw de forma idempotente.
    Usa ON CONFLICT (id) DO UPDATE para actualizar el payload en caso de cambios de estado.
    Retorna la cantidad de eventos procesados.
    """
    if not features:
        return 0

    sql = """
        INSERT INTO raw.usgs_earthquakes_raw (id, properties, geometry, source_feed, batch_id, ingested_at)
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
            properties = EXCLUDED.properties,
            geometry = EXCLUDED.geometry,
            source_feed = EXCLUDED.source_feed,
            batch_id = EXCLUDED.batch_id,
            ingested_at = CURRENT_TIMESTAMP;
    """

    data = [
        (
            f.get("id"),
            Json(f.get("properties") or {}),
            Json(f.get("geometry") or {}),
            source_feed,
            batch_id
        )
        for f in features
        if f.get("id")
    ]

    conn = get_db_connection(role="ingest")
    try:
        with conn.cursor() as cur:
            execute_values(
                cur,
                sql,
                data,
                template="(%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)",
                page_size=1000
            )
        conn.commit()
        logger.info("Ingestados %d eventos crudos en raw.usgs_earthquakes_raw (batch: %s)", len(data), batch_id)
        return len(data)
    finally:
        conn.close()


def insert_staging_events(records: List[Dict[str, Any]]) -> int:
    """
    Inserta eventos normalizados en staging.earthquakes_staging de forma idempotente.
    """
    if not records:
        return 0

    cols = [
        "id", "mag", "place", "time", "updated", "tz", "url", "detail", "felt",
        "cdi", "mmi", "alert", "status", "tsunami", "sig", "net", "code", "ids",
        "sources", "types", "nst", "dmin", "rms", "gap", "mag_type", "type",
        "title", "longitude", "latitude", "depth_km", "batch_id"
    ]

    sql = f"""
        INSERT INTO staging.earthquakes_staging ({', '.join(cols)}, transformed_at)
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
            mag = EXCLUDED.mag,
            place = EXCLUDED.place,
            time = EXCLUDED.time,
            updated = EXCLUDED.updated,
            status = EXCLUDED.status,
            tsunami = EXCLUDED.tsunami,
            sig = EXCLUDED.sig,
            alert = EXCLUDED.alert,
            longitude = EXCLUDED.longitude,
            latitude = EXCLUDED.latitude,
            depth_km = EXCLUDED.depth_km,
            batch_id = EXCLUDED.batch_id,
            transformed_at = CURRENT_TIMESTAMP;
    """

    data = [
        tuple(r.get(c) for c in cols)
        for r in records
    ]

    template = f"({', '.join(['%s'] * len(cols))}, CURRENT_TIMESTAMP)"

    conn = get_db_connection(role="transform")
    try:
        with conn.cursor() as cur:
            execute_values(cur, sql, data, template=template, page_size=1000)
        conn.commit()
        logger.info("Guardados %d registros en staging.earthquakes_staging", len(data))
        return len(data)
    finally:
        conn.close()


def upsert_curated_events(records: List[Dict[str, Any]]) -> int:
    """
    Inserta eventos válidos en curated.earthquakes_curated con UPSERT idempotente.
    """
    if not records:
        return 0

    cols = [
        "id", "mag", "place", "time", "updated", "tz", "url", "detail", "felt",
        "cdi", "mmi", "alert", "status", "tsunami", "sig", "net", "code", "ids",
        "sources", "types", "nst", "dmin", "rms", "gap", "mag_type", "type",
        "title", "longitude", "latitude", "depth_km", "batch_id"
    ]

    sql = f"""
        INSERT INTO curated.earthquakes_curated ({', '.join(cols)}, is_validated, curated_at)
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
            mag = EXCLUDED.mag,
            place = EXCLUDED.place,
            time = EXCLUDED.time,
            updated = EXCLUDED.updated,
            status = EXCLUDED.status,
            tsunami = EXCLUDED.tsunami,
            sig = EXCLUDED.sig,
            alert = EXCLUDED.alert,
            longitude = EXCLUDED.longitude,
            latitude = EXCLUDED.latitude,
            depth_km = EXCLUDED.depth_km,
            batch_id = EXCLUDED.batch_id,
            is_validated = TRUE,
            curated_at = CURRENT_TIMESTAMP;
    """

    data = [
        tuple(r.get(c) for c in cols)
        for r in records
    ]

    template = f"({', '.join(['%s'] * len(cols))}, TRUE, CURRENT_TIMESTAMP)"

    conn = get_db_connection(role="transform")
    try:
        with conn.cursor() as cur:
            execute_values(cur, sql, data, template=template, page_size=1000)
        conn.commit()
        logger.info("Publicados %d registros validados en curated.earthquakes_curated", len(data))
        return len(data)
    finally:
        conn.close()


def insert_quarantine_records(quarantined_records: List[Dict[str, Any]]) -> int:
    """
    Desvía registros inválidos a curated.quality_quarantine con trazabilidad del motivo.
    """
    if not quarantined_records:
        return 0

    sql = """
        INSERT INTO curated.quality_quarantine (event_id, raw_payload, rejection_reason, rule_failed, batch_id, failed_at)
        VALUES %s;
    """

    data = [
        (
            r.get("event_id"),
            Json(r.get("raw_payload") or {}),
            r.get("rejection_reason", "UNKNOWN_ERROR"),
            r.get("rule_failed", "UNKNOWN_RULE"),
            r.get("batch_id", ""),
        )
        for r in quarantined_records
    ]

    conn = get_db_connection(role="transform")
    try:
        with conn.cursor() as cur:
            execute_values(
                cur,
                sql,
                data,
                template="(%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)",
                page_size=1000
            )
        conn.commit()
        logger.warning("Enviados %d registros a curated.quality_quarantine", len(data))
        return len(data)
    finally:
        conn.close()


def record_quality_results(
    dag_run_id: str,
    total_records: int,
    records_passed: int,
    records_rejected: int,
    quality_score: float,
    rules_summary: Dict[str, Any],
    freshness_lag_seconds: int = 0
) -> None:
    """Guarda las métricas de calidad de la ejecución en curated.quality_results."""
    sql = """
        INSERT INTO curated.quality_results
            (dag_run_id, evaluated_at, total_records, records_passed, records_rejected, quality_score, rules_summary, freshness_lag_seconds)
        VALUES (%s, CURRENT_TIMESTAMP, %s, %s, %s, %s, %s, %s);
    """
    conn = get_db_connection(role="transform")
    try:
        with conn.cursor() as cur:
            cur.execute(
                sql,
                (
                    dag_run_id,
                    total_records,
                    records_passed,
                    records_rejected,
                    round(quality_score, 2),
                    Json(rules_summary),
                    freshness_lag_seconds,
                )
            )
        conn.commit()
        logger.info("Métricas de calidad registradas para run %s (score: %.2f)", dag_run_id, quality_score)
    finally:
        conn.close()


def record_pipeline_run(
    dag_id: str,
    run_id: str,
    status: str,
    start_time: Any,
    end_time: Optional[Any] = None,
    duration_seconds: Optional[float] = None,
    records_ingested: int = 0,
    records_curated: int = 0,
    records_quarantined: int = 0,
    error_details: Optional[str] = None
) -> None:
    """
    Registra o actualiza el estado de la ejecución del DAG en curated.pipeline_runs.
    Permite que la API consulte la salud del pipeline sin tocar la base de Airflow.
    """
    sql = """
        INSERT INTO curated.pipeline_runs
            (dag_id, run_id, status, start_time, end_time, duration_seconds,
             records_ingested, records_curated, records_quarantined, error_details, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (run_id) DO UPDATE SET
            status = EXCLUDED.status,
            end_time = EXCLUDED.end_time,
            duration_seconds = EXCLUDED.duration_seconds,
            records_ingested = EXCLUDED.records_ingested,
            records_curated = EXCLUDED.records_curated,
            records_quarantined = EXCLUDED.records_quarantined,
            error_details = EXCLUDED.error_details,
            updated_at = CURRENT_TIMESTAMP;
    """
    conn = get_db_connection(role="transform")
    try:
        with conn.cursor() as cur:
            cur.execute(
                sql,
                (
                    dag_id,
                    run_id,
                    status.upper(),
                    start_time,
                    end_time,
                    round(duration_seconds, 2) if duration_seconds is not None else None,
                    records_ingested,
                    records_curated,
                    records_quarantined,
                    error_details
                )
            )
        conn.commit()
    finally:
        conn.close()
