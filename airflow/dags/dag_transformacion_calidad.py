"""
DAG de Transformación y Calidad (Raw -> Staging -> Curated / Cuarentena)
Se dispara automáticamente tras la ingesta o ejecución de backfill.
Aplica validaciones bloqueantes con Pandera y enruta registros inválidos a cuarentena.
"""

from datetime import datetime, timedelta, timezone
import json
from airflow.decorators import dag, task
from airflow.utils.task_group import TaskGroup
from airflow.include.transformations import parse_geojson_feature
from airflow.include.quality import evaluate_batch_quality, check_freshness
from airflow.include.db_utils import (
    get_db_connection,
    insert_staging_events,
    upsert_curated_events,
    insert_quarantine_records,
    record_quality_results,
    record_pipeline_run
)
from airflow.include.alerts import pipeline_failure_callback

DOC_MD = """
### Propósito del DAG
Procesa los datos crudos desde la capa Bronze (`raw`), los aplana y normaliza en la capa Silver (`staging`), ejecuta validaciones bloqueantes de calidad de datos con Pandera, y finalmente publica exclusivamente los registros válidos en la capa Gold (`curated`).

### Reglas de Calidad y Cuarentena
1. **Campos obligatorios**: `id`, `time`, `latitude`, `longitude` no nulos.
2. **Límites geográficos**: latitud en [-90, 90], longitud en [-180, 180].
3. **Límites físicos plausibles**: magnitud en [-2.0, 10.5], profundidad en [-10, 1000] km.
4. **Formato y validez de fecha**: ISO 8601 UTC dentro de límites plausibles.
5. **Unicidad**: Detección de identificadores repetidos en el lote.

Si un registro viola alguna regla, **nunca llega a curated**: se envía a `curated.quality_quarantine` con la regla infringida y el motivo exacto, y se registra en `curated.quality_results`.
"""

default_args = {
    "owner": "sismowatch",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(seconds=20),
    "retry_exponential_backoff": True,
    "execution_timeout": timedelta(minutes=5),
    "on_failure_callback": pipeline_failure_callback,
}


@dag(
    dag_id="dag_transformacion_calidad",
    default_args=default_args,
    description="Procesamiento Medallion: Raw -> Staging -> Calidad -> Curated / Cuarentena",
    schedule_interval=None,  # Disparado por DAGs de ingesta o backfill
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["sismowatch", "transformacion", "calidad", "curated", "quarantine"],
    doc_md=DOC_MD,
)
def transformacion_calidad_pipeline():

    @task
    def registrar_inicio(**context):
        run_id = context["run_id"]
        start_time = datetime.now(timezone.utc)
        record_pipeline_run(
            dag_id="dag_transformacion_calidad",
            run_id=run_id,
            status="RUNNING",
            start_time=start_time
        )
        return {"run_id": run_id, "start_time": start_time.isoformat()}

    @task
    def procesar_raw_a_staging(inicio_info: dict, **context):
        """
        Lee los últimos registros de raw.usgs_earthquakes_raw, los transforma y
        los almacena de forma estructurada en staging.earthquakes_staging.
        """
        batch_id = f"proc_{int(datetime.now(timezone.utc).timestamp())}"
        
        # Consultar eventos crudos recientes (últimas 2 horas o hasta 2000 eventos)
        conn = get_db_connection(role="transform")
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, properties, geometry
                    FROM raw.usgs_earthquakes_raw
                    WHERE ingested_at >= CURRENT_TIMESTAMP - INTERVAL '2 hours'
                    ORDER BY ingested_at DESC
                    LIMIT 2000;
                """)
                raw_rows = cur.fetchall()
        finally:
            conn.close()

        if not raw_rows:
            # Fallback para pruebas si no hay de las últimas 2 horas: tomar los 500 más recientes
            conn = get_db_connection(role="transform")
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id, properties, geometry
                        FROM raw.usgs_earthquakes_raw
                        ORDER BY ingested_at DESC
                        LIMIT 500;
                    """)
                    raw_rows = cur.fetchall()
            finally:
                conn.close()

        # Transformación a formato staging
        staging_records = []
        for r in raw_rows:
            feature_dict = {
                "id": r[0],
                "properties": r[1] if isinstance(r[1], dict) else json.loads(r[1]),
                "geometry": r[2] if isinstance(r[2], dict) else json.loads(r[2]),
            }
            staging_records.append(parse_geojson_feature(feature_dict, batch_id))

        # Inserción en staging
        inserted_staging = insert_staging_events(staging_records)
        return {
            "batch_id": batch_id,
            "staging_count": inserted_staging,
            "records": staging_records
        }

    @task
    def evaluar_calidad_y_publicar_curated(staging_info: dict, inicio_info: dict, **context):
        """
        Aplica validaciones de Pandera e integridad lógica.
        Separa válidos hacia curated.earthquakes_curated e inválidos hacia curated.quality_quarantine.
        """
        batch_id = staging_info["batch_id"]
        records = staging_info["records"]
        run_id = inicio_info["run_id"]

        valid_records, quarantine_records, metrics = evaluate_batch_quality(records, batch_id)

        # 1. Enviar inválidos a cuarentena
        if quarantine_records:
            insert_quarantine_records(quarantine_records)

        # 2. Publicar válidos en curated
        curated_count = 0
        if valid_records:
            curated_count = upsert_curated_events(valid_records)

        # 3. Control de frescura
        latest_time = valid_records[0].get("time") if valid_records else None
        freshness_lag = check_freshness(latest_time)

        # 4. Registrar auditoría de calidad en curated.quality_results
        record_quality_results(
            dag_run_id=run_id,
            total_records=metrics["total_records"],
            records_passed=metrics["valid_count"],
            records_rejected=metrics["quarantine_count"],
            quality_score=metrics["quality_score"],
            rules_summary=metrics["rules_breakdown"],
            freshness_lag_seconds=freshness_lag
        )

        return {
            "curated_count": curated_count,
            "quarantined_count": len(quarantine_records),
            "quality_score": metrics["quality_score"],
            "run_id": run_id
        }

    @task
    def registrar_fin(calidad_info: dict, inicio_info: dict, **context):
        run_id = calidad_info["run_id"]
        start_time = datetime.fromisoformat(inicio_info["start_time"])
        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()

        record_pipeline_run(
            dag_id="dag_transformacion_calidad",
            run_id=run_id,
            status="SUCCESS",
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration,
            records_curated=calidad_info["curated_count"],
            records_quarantined=calidad_info["quarantined_count"]
        )
        return calidad_info

    info_inicio = registrar_inicio()
    info_staging = procesar_raw_a_staging(info_inicio)
    info_calidad = evaluar_calidad_y_publicar_curated(info_staging, info_inicio)
    registrar_fin(info_calidad, info_inicio)


transformacion_dag = transformacion_calidad_pipeline()
