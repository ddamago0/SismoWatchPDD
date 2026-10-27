"""
DAG Diario de Reporte Ejecutivo con IA y Detección de Anomalías.
Calcula métricas agregadas en Python/SQL, detecta anomalías estadísticas (Z-score),
invoca el cliente de IA en cascada (Gemini -> Groq -> Fallback) y guarda en curated.ai_reports.
"""

from datetime import datetime, date, timedelta, timezone
import json
from airflow.decorators import dag, task
from airflow.include.anomaly_detection import detect_seismic_anomalies, extract_region
from airflow.include.ai.client import generate_executive_report_resilient
from airflow.include.db_utils import get_db_connection, record_pipeline_run
from airflow.include.alerts import pipeline_failure_callback
from psycopg2.extras import Json, execute_values

DOC_MD = """
### Propósito del DAG
Automatización diaria de análisis de datos e inteligencia artificial:
1. **Cálculo Determinístico**: Calcula indicadores agregados de las últimas 24 horas (total de eventos, magnitud máxima, promedio, alertas de tsunami).
2. **Detección de Anomalías**: Ejecuta análisis Z-Score sobre volumen regional para detectar enjambres y picos de actividad.
3. **IA Generativa Resiliente**: Genera un informe ejecutivo narrativo mediante una cascada multi-provider (Google Gemini -> Groq LLaMA 3.3 -> Plantilla determinística).
4. **Validación Numérica**: Contrasta las cifras del texto con las calculadas para evitar alucinaciones.
5. **Auditoría**: Registra el informe en `curated.ai_reports` y la telemetría en `curated.ai_runs`.
"""

default_args = {
    "owner": "sismowatch",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(seconds=30),
    "retry_exponential_backoff": True,
    "execution_timeout": timedelta(minutes=5),
    "on_failure_callback": pipeline_failure_callback,
}


@dag(
    dag_id="dag_reporte_ia_anomalias",
    default_args=default_args,
    description="Generación diaria de reporte narrativo con IA y detección de anomalías sísmicas",
    schedule_interval="0 6 * * *",  # Diario a las 06:00 UTC
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["sismowatch", "ia", "reportes", "anomalias", "curated"],
    doc_md=DOC_MD,
)
def reporte_ia_anomalias_pipeline():

    @task
    def registrar_inicio(**context):
        run_id = context["run_id"]
        start_time = datetime.now(timezone.utc)
        record_pipeline_run(
            dag_id="dag_reporte_ia_anomalias",
            run_id=run_id,
            status="RUNNING",
            start_time=start_time
        )
        return {"run_id": run_id, "start_time": start_time.isoformat()}

    @task
    def calcular_metricas_y_anomalias(inicio_info: dict, **context):
        """Calcula métricas matemáticas exactas sobre los eventos de las últimas 24h."""
        conn = get_db_connection(role="transform")
        try:
            with conn.cursor() as cur:
                # 1. Obtener eventos de las últimas 24 horas (o más recientes si es entorno inicial)
                cur.execute("""
                    SELECT id, mag, place, time, tsunami, sig, alert, longitude, latitude, depth_km
                    FROM curated.earthquakes_curated
                    WHERE time >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
                    ORDER BY time DESC;
                """)
                rows = cur.fetchall()

                # Fallback para pruebas iniciales si aún no hay 24h completas
                if len(rows) < 5:
                    cur.execute("""
                        SELECT id, mag, place, time, tsunami, sig, alert, longitude, latitude, depth_km
                        FROM curated.earthquakes_curated
                        ORDER BY time DESC
                        LIMIT 100;
                    """)
                    rows = cur.fetchall()

            events = [
                {
                    "id": r[0],
                    "mag": float(r[1]),
                    "place": r[2],
                    "time": r[3].isoformat() if hasattr(r[3], "isoformat") else str(r[3]),
                    "tsunami": int(r[4] or 0),
                    "sig": int(r[5] or 0),
                    "alert": r[6],
                    "longitude": float(r[7]),
                    "latitude": float(r[8]),
                    "depth_km": float(r[9]),
                }
                for r in rows
            ]
        finally:
            conn.close()

        total_events = len(events)
        if total_events > 0:
            mags = [e["mag"] for e in events]
            max_mag = max(mags)
            avg_mag = round(sum(mags) / total_events, 2)
            tsunami_alerts = sum(1 for e in events if e["tsunami"] == 1)
            # Buscar evento máximo
            max_event = next(e for e in events if e["mag"] == max_mag)
        else:
            max_mag = 0.0
            avg_mag = 0.0
            tsunami_alerts = 0
            max_event = {"place": "Sin actividad registrada", "id": "none", "mag": 0.0}

        # Calcular top regiones
        region_counts = {}
        region_max = {}
        for e in events:
            reg = extract_region(e.get("place"))
            region_counts[reg] = region_counts.get(reg, 0) + 1
            region_max[reg] = max(region_max.get(reg, 0.0), e["mag"])

        top_regions = [
            {"region": reg, "count": count, "max_mag": region_max[reg]}
            for reg, count in sorted(region_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        ]

        # Detección analítica de anomalías (Z-Score)
        anomalies = detect_seismic_anomalies(events, z_threshold=2.0)

        report_date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        metrics_payload = {
            "report_date": report_date_str,
            "total_events_24h": total_events,
            "max_magnitude": max_mag,
            "max_magnitude_place": max_event.get("place", "N/A"),
            "max_event_detail": max_event,
            "avg_magnitude": avg_mag,
            "tsunami_alerts_count": tsunami_alerts,
            "top_regions": top_regions,
            "anomalies": anomalies,
            "run_id": inicio_info["run_id"]
        }
        return metrics_payload

    @task
    def redactar_y_publicar_reporte(metrics: dict, inicio_info: dict, **context):
        """Genera el texto con el cliente en cascada y guarda en curated.ai_reports."""
        run_id = inicio_info["run_id"]
        result = generate_executive_report_resilient(metrics, run_id)

        report_date = metrics["report_date"]
        title = f"Reporte de Monitoreo Sísmico Global - {report_date}"
        narrative = result["narrative"]
        provider = result["provider"]
        validation_passed = result["validation_passed"]

        # Inserción en curated.ai_reports
        sql = """
            INSERT INTO curated.ai_reports
                (report_date, title, summary_narrative, top_regions, max_magnitude_event,
                 total_events_24h, avg_magnitude, tsunami_alerts_count, anomalies_detected,
                 provider_used, validation_passed, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (report_date) DO UPDATE SET
                title = EXCLUDED.title,
                summary_narrative = EXCLUDED.summary_narrative,
                top_regions = EXCLUDED.top_regions,
                max_magnitude_event = EXCLUDED.max_magnitude_event,
                total_events_24h = EXCLUDED.total_events_24h,
                avg_magnitude = EXCLUDED.avg_magnitude,
                tsunami_alerts_count = EXCLUDED.tsunami_alerts_count,
                anomalies_detected = EXCLUDED.anomalies_detected,
                provider_used = EXCLUDED.provider_used,
                validation_passed = EXCLUDED.validation_passed,
                created_at = CURRENT_TIMESTAMP;
        """
        conn = get_db_connection(role="transform")
        try:
            with conn.cursor() as cur:
                cur.execute(
                    sql,
                    (
                        report_date,
                        title,
                        narrative,
                        Json(metrics["top_regions"]),
                        Json(metrics["max_event_detail"]),
                        metrics["total_events_24h"],
                        metrics["avg_magnitude"],
                        metrics["tsunami_alerts_count"],
                        Json(metrics["anomalies"]),
                        provider,
                        validation_passed
                    )
                )

                # Persistencia en tabla analítica especializada curated.seismic_anomalies
                anomalies_list = metrics.get("anomalies", [])
                if anomalies_list:
                    anom_sql = """
                        INSERT INTO curated.seismic_anomalies
                            (anomaly_type, region, event_id, cluster_size, latitude, longitude, radius_km, z_score, max_magnitude, severity, explanation, detected_at)
                        VALUES %s;
                    """
                    data_anom = [
                        (
                            a.get("type", "UNKNOWN"),
                            a.get("region"),
                            a.get("event_id"),
                            a.get("cluster_size", 1),
                            a.get("latitude"),
                            a.get("longitude"),
                            a.get("radius_km"),
                            a.get("z_score"),
                            a.get("max_magnitude"),
                            a.get("severity", "MEDIUM"),
                            a.get("explanation", ""),
                        )
                        for a in anomalies_list
                    ]
                    execute_values(cur, anom_sql, data_anom, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)")

            conn.commit()
        finally:
            conn.close()

        return {
            "report_date": report_date,
            "provider_used": provider,
            "validation_passed": validation_passed,
            "run_id": run_id
        }

    @task
    def registrar_fin(reporte_info: dict, inicio_info: dict, **context):
        run_id = reporte_info["run_id"]
        start_time = datetime.fromisoformat(inicio_info["start_time"])
        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()

        record_pipeline_run(
            dag_id="dag_reporte_ia_anomalias",
            run_id=run_id,
            status="SUCCESS",
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration
        )
        return reporte_info

    info_inicio = registrar_inicio()
    metrics = calcular_metricas_y_anomalias(info_inicio)
    info_reporte = redactar_y_publicar_reporte(metrics, info_inicio)
    registrar_fin(info_reporte, info_inicio)


reporte_ia_dag = reporte_ia_anomalias_pipeline()
