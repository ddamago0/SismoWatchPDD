"""
DAG de Ingesta Continua de Sismos (USGS -> Raw / Bronze)
Consulta el feed en vivo cada 5 minutos e inserta de forma idempotente en PostgreSQL.
"""

from datetime import datetime, timedelta, timezone
from airflow.decorators import dag, task
from airflow.operators.trigger_dagrun import TriggerDagRunOperator
from airflow.include.usgs_client import fetch_live_events, USGSUnavailableError
from airflow.include.db_utils import insert_raw_events, record_pipeline_run
from airflow.include.alerts import pipeline_failure_callback

DOC_MD = """
### Propósito del DAG
Extrae cada 5 minutos el feed oficial de eventos sísmicos de la última hora desde el servicio geológico USGS (`all_hour.geojson`) y los persiste de forma cruda e inmutable en el esquema `raw` (Capa Bronze).

### Garantías de Arquitectura
- **Idempotencia**: Si el mismo evento vuelve a recibirse, actualiza su payload JSONB sin duplicar la llave primaria `id`.
- **Resiliencia**: 3 reintentos con backoff exponencial y timeout estricto de 2 minutos. Si la API de USGS cae, falla explícitamente sin registrar falsos éxitos.
- **Desacoplamiento**: Al finalizar, dispara el DAG de transformación y calidad `dag_transformacion_calidad` sin pasar datos pesados por XCom.
"""

default_args = {
    "owner": "sismowatch",
    "depends_on_past": False,
    "retries": 3,
    "retry_delay": timedelta(seconds=20),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=2),
    "execution_timeout": timedelta(minutes=2),
    "on_failure_callback": pipeline_failure_callback,
}


@dag(
    dag_id="dag_ingesta_usgs",
    default_args=default_args,
    description="Ingesta periódica cada 5 min del feed sísmico USGS all_hour a capa raw",
    schedule_interval="*/5 * * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["sismowatch", "ingesta", "raw", "usgs"],
    doc_md=DOC_MD,
)
def ingesta_usgs_pipeline():

    @task
    def registrar_inicio(**context):
        run_id = context["run_id"]
        start_time = datetime.now(timezone.utc)
        record_pipeline_run(
            dag_id="dag_ingesta_usgs",
            run_id=run_id,
            status="RUNNING",
            start_time=start_time,
            records_ingested=0
        )
        return {"run_id": run_id, "start_time": start_time.isoformat()}

    @task
    def extraer_y_persistir_raw(inicio_info: dict, **context):
        run_id = inicio_info["run_id"]
        batch_id = f"live_{int(datetime.now(timezone.utc).timestamp())}"
        
        # Descarga desde USGS
        payload = fetch_live_events(timeout_seconds=15)
        features = payload.get("features", [])
        
        # Inserción idempotente en PostgreSQL schema raw
        count = insert_raw_events(
            features=features,
            source_feed="all_hour.geojson",
            batch_id=batch_id
        )

        return {"batch_id": batch_id, "count": count, "run_id": run_id}

    @task
    def registrar_fin(ingesta_info: dict, inicio_info: dict, **context):
        run_id = ingesta_info["run_id"]
        start_time = datetime.fromisoformat(inicio_info["start_time"])
        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()

        record_pipeline_run(
            dag_id="dag_ingesta_usgs",
            run_id=run_id,
            status="SUCCESS",
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration,
            records_ingested=ingesta_info["count"]
        )
        return ingesta_info["batch_id"]

    # Trigger del siguiente DAG en el pipeline Medallion
    disparar_transformacion = TriggerDagRunOperator(
        task_id="disparar_dag_transformacion_calidad",
        trigger_dag_id="dag_transformacion_calidad",
        wait_for_completion=False,
        reset_dag_run=True,
    )

    # Definición del flujo
    info_inicio = registrar_inicio()
    info_ingesta = extraer_y_persistir_raw(info_inicio)
    batch = registrar_fin(info_ingesta, info_inicio)
    batch >> disparar_transformacion


ingesta_dag = ingesta_usgs_pipeline()
