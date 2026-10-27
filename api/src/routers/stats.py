"""
Router de Estadísticas Agregadas para Gráficos Recharts.
Accesible para roles: viewer, admin.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.auth.dependencies import require_role
from src.database import get_db
from src.schemas.events import TimeseriesPoint

router = APIRouter(prefix="/api/stats", tags=["Estadísticas"])


@router.get("/timeseries", response_model=List[TimeseriesPoint])
def get_timeseries(
    current_user: dict = Depends(require_role(["viewer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Retorna la serie temporal agrupada por hora (últimas 24-48 horas)
    con conteo, magnitud máxima y magnitud promedio para la gráfica principal.
    """
    sql = text("""
        SELECT
            to_char(date_trunc('hour', time), 'YYYY-MM-DD HH24:00') AS time_bucket,
            COUNT(*) AS event_count,
            COALESCE(MAX(mag), 0.0) AS max_mag,
            COALESCE(AVG(mag), 0.0) AS avg_mag
        FROM curated.earthquakes_curated
        WHERE time >= CURRENT_TIMESTAMP - INTERVAL '48 hours'
        GROUP BY date_trunc('hour', time)
        ORDER BY date_trunc('hour', time) ASC;
    """)
    rows = db.execute(sql).fetchall()

    if not rows:
        # Fallback si no hay eventos en 48h (entorno nuevo): tomar todas las horas registradas
        sql_fallback = text("""
            SELECT
                to_char(date_trunc('hour', time), 'YYYY-MM-DD HH24:00') AS time_bucket,
                COUNT(*) AS event_count,
                COALESCE(MAX(mag), 0.0) AS max_mag,
                COALESCE(AVG(mag), 0.0) AS avg_mag
            FROM curated.earthquakes_curated
            GROUP BY date_trunc('hour', time)
            ORDER BY date_trunc('hour', time) ASC
            LIMIT 50;
        """)
        rows = db.execute(sql_fallback).fetchall()

    return [
        TimeseriesPoint(
            timestamp=r[0],
            count=int(r[1]),
            max_mag=float(r[2]),
            avg_mag=round(float(r[3]), 2)
        )
        for r in rows
    ]


@router.get("/distributions")
def get_distributions(
    current_user: dict = Depends(require_role(["viewer", "admin"])),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Retorna la distribución por rangos de magnitud y las 5 regiones más activas.
    """
    sql_mag = text("""
        SELECT
            CASE
                WHEN mag < 2.0 THEN '< 2.0 (Micro)'
                WHEN mag >= 2.0 AND mag < 4.0 THEN '2.0 - 3.9 (Menor)'
                WHEN mag >= 4.0 AND mag < 5.5 THEN '4.0 - 5.4 (Ligero/Moderado)'
                WHEN mag >= 5.5 AND mag < 7.0 THEN '5.5 - 6.9 (Fuerte)'
                ELSE '>= 7.0 (Mayor/Severo)'
            END AS bucket,
            COUNT(*) AS count
        FROM curated.earthquakes_curated
        GROUP BY bucket
        ORDER BY count DESC;
    """)
    mag_rows = db.execute(sql_mag).fetchall()
    magnitude_dist = [{"range": r[0], "count": int(r[1])} for r in mag_rows]

    sql_regions = text("""
        SELECT
            COALESCE(
                NULLIF(split_part(place, ', ', 2), ''),
                NULLIF(split_part(place, ' of ', 2), ''),
                place
            ) AS region,
            COUNT(*) AS count,
            MAX(mag) AS max_mag
        FROM curated.earthquakes_curated
        GROUP BY region
        ORDER BY count DESC
        LIMIT 6;
    """)
    reg_rows = db.execute(sql_regions).fetchall()
    top_regions = [
        {"region": r[0] or "Océano / Global", "count": int(r[1]), "max_mag": float(r[2] or 0.0)}
        for r in reg_rows
    ]

    return {
        "magnitude_distribution": magnitude_dist,
        "top_regions": top_regions
    }
