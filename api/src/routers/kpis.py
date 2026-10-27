"""
Router de Indicadores Clave de Desempeño (KPIs) del Dashboard.
Accesible para roles: viewer, admin.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.auth.dependencies import require_role
from src.database import get_db
from src.schemas.events import KPIResponse

router = APIRouter(prefix="/api/kpis", tags=["KPIs"])


@router.get("", response_model=KPIResponse)
def get_kpis(
    current_user: dict = Depends(require_role(["viewer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Retorna métricas del dashboard calculadas sobre la capa curated:
    - Eventos en las últimas 24h
    - Magnitud máxima
    - Magnitud promedio
    - Conteo de alertas de tsunami
    - Puntaje de calidad de la última evaluación
    - Timestamp de última actualización
    """
    sql_events = text("""
        SELECT
            COUNT(*) AS total_24h,
            COALESCE(MAX(mag), 0.0) AS max_mag,
            COALESCE(AVG(mag), 0.0) AS avg_mag,
            COALESCE(SUM(CASE WHEN tsunami = 1 THEN 1 ELSE 0 END), 0) AS tsunamis,
            MAX(time) AS latest_time
        FROM curated.earthquakes_curated
        WHERE time >= CURRENT_TIMESTAMP - INTERVAL '24 hours';
    """)
    row_events = db.execute(sql_events).fetchone()

    total_24h = int(row_events[0] or 0)
    max_mag = float(row_events[1] or 0.0)
    avg_mag = round(float(row_events[2] or 0.0), 2)
    tsunamis = int(row_events[3] or 0)
    latest_event_time = row_events[4]

    # Si es un entorno recién iniciado con menos de 24h, calcular sobre todos los eventos
    if total_24h == 0:
        sql_fallback = text("""
            SELECT COUNT(*), COALESCE(MAX(mag), 0.0), COALESCE(AVG(mag), 0.0),
                   COALESCE(SUM(CASE WHEN tsunami = 1 THEN 1 ELSE 0 END), 0), MAX(time)
            FROM curated.earthquakes_curated;
        """)
        row_fb = db.execute(sql_fallback).fetchone()
        total_24h = int(row_fb[0] or 0)
        max_mag = float(row_fb[1] or 0.0)
        avg_mag = round(float(row_fb[2] or 0.0), 2)
        tsunamis = int(row_fb[3] or 0)
        latest_event_time = row_fb[4]

    # Obtener el último puntaje de calidad registrado
    sql_quality = text("""
        SELECT quality_score
        FROM curated.quality_results
        ORDER BY evaluated_at DESC
        LIMIT 1;
    """)
    row_quality = db.execute(sql_quality).fetchone()
    quality_score = float(row_quality[0]) if row_quality else 100.0

    return KPIResponse(
        total_events_24h=total_24h,
        max_magnitude=max_mag,
        avg_magnitude=avg_mag,
        tsunami_alerts_count=tsunamis,
        quality_score=quality_score,
        latest_update=latest_event_time or datetime.now(timezone.utc)
    )
