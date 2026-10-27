"""
DAG de Backfill Histórico Parametrizado (USGS FDSNWS -> Raw / Bronze)
Permite cargar de 1 a 30+ días de histórico sin duplicar registros en Postgres.
"""

from datetime import datetime, timedelta, timezone
from airflow.decorators import dag, task
from airflow.models.param import Param
from airflow.operators.trigger_dagrun import TriggerDagRunOperator
from airflow.include.usgs_client import fetch_historical_events
from airflow.include.db_utils import insert_raw_events, record_pipeline_run
from airflow.include.alerts import pipeline_failure_callback

DOC_MD = """
### Propósito del DAG
Carga histórica parametrizada de eventos sísmicos desde el catálogo oficial USGS FDSNWS.
Por defecto extrae los últimos 30 días con magnitud mayor o igual a 2.5.

### Parámetros configurables:
- `start_date` (string YYYY-MM-DD): Fecha de inicio del intervalo (default: 30 días atrás).
- `end_date` (string YYYY-MM-DD): Fecha de fin del intervalo (default: hoy).
- `min_magnitude` (float): Magnitud mínima de los sismos a consultar (default: 2.5).

### Idempotencia
Garantizada mediante `ON CONFLICT (id) DO UPDATE` en la capa raw y posterior propagación a staging y curated.
"""

default_args = {
    "owner": "sismowatch",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(seconds=30),
    "retry_exponential_backoff": True,
    "execution_timeout": timedelta(minutes=10),
    "on_failure_callback": pipeline_failure_callback,
}


@dag(
    dag_id="dag_backfill_historico",
    default_args=default_args,
    description="Carga histórica parametrizada (hasta 30 días) desde USGS FDSNWS a capa raw",
    schedule_interval=None,  # Solo ejecución manual / API admin
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    params={
        "start_date": Param(
            (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d"),
            type="string",
            description="Fecha inicial (YYYY-MM-DD)"
        ),
        "end_date": Param(
            datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            type="string",
            description="Fecha final (YYYY-MM-DD)"
        ),
        "min_magnitude": Param(
            2.5,
            type="number",
            minimum=0.0,
            maximum=10.0,
            description="Magnitud mínima"
        ),
    },
    tags=["sismowatch", "backfill", "historico", "admin"],
    doc_md=DOC_MD,
)
def backfill_usgs_pipeline():

    @task
    def registrar_inicio(**context):
        run_id = context["run_id"]
        start_time = datetime.now(timezone.utc)
        record_pipeline_run(
            dag_id="dag_backfill_historico",
            run_id=run_id,
            status="RUNNING",
            start_time=start_time,
            records_ingested=0
        )
        return {"run_id": run_id, "start_time": start_time.isoformat()}

    @task
    def extraer_y_persistir_historico(inicio_info: dict, **context):
        params = context["params"]
        start_date = params["start_date"]
        end_date = params["end_date"]
        min_mag = float(params["min_magnitude"])
        batch_id = f"backfill_{start_date}_{end_date}"

        # Descarga desde endpoint de consulta FDSNWS
        payload = fetch_historical_events(
            start_time=start_date,
            end_time=end_date,
            min_magnitude=min_mag,
            timeout_seconds=60
        )
        features = payload.get("features", [])

        # Inserción idempotente en schema raw
        count = insert_raw_events(
            features=features,
            source_feed=f"fdsnws_query_{start_date}_{end_date}",
            batch_id=batch_id
        )

        return {"batch_id": batch_id, "count": count, "run_id": inicio_info["run_id"]}

    @task
    def registrar_fin(ingesta_info: dict, inicio_info: dict, **context):
        run_id = ingesta_info["run_id"]
        start_time = datetime.fromisoformat(inicio_info["start_time"])
        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()

        record_pipeline_run(
            dag_id="dag_backfill_historico",
            run_id=run_id,
            status="SUCCESS",
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration,
            records_ingested=ingesta_info["count"]
        )
        return ingesta_info["batch_id"]

    disparar_transformacion = TriggerDagRunOperator(
        task_id="disparar_transformacion_tras_backfill",
        trigger_dag_id="dag_transformacion_calidad",
        wait_for_completion=False,
        reset_dag_run=True,
    )

    info_inicio = registrar_inicio()
    info_ingesta = extraer_y_persistir_historico(info_inicio)
    batch = registrar_fin(info_ingesta, info_inicio)
    batch >> disparar_transformacion


backfill_dag = backfill_usgs_pipeline()
