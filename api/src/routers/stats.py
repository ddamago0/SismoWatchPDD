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


@router.get("", response_model=Dict[str, Any])
@router.get("/", response_model=Dict[str, Any])
def get_stats(
    hours: int = 24,
    current_user: dict = Depends(require_role(["viewer", "admin"])),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Retorna métricas consolidadas para el módulo de Análisis:
    - timeline: serie temporal horaria con conteo, magnitud promedio y máxima.
    - magnitude_distribution: conteo agrupado por los 4 rangos estándar (< 3.0, 3.0 - 4.5, 4.5 - 6.0, >= 6.0).
    - top_regions: top zonas geográficas con mayor recurrencia y magnitud media.
    """
    # 1. Timeline
    sql_timeline = text("""
        SELECT
            to_char(date_trunc('hour', time), 'YYYY-MM-DD HH24:00') AS time_bucket,
            COUNT(*) AS count,
            COALESCE(AVG(mag), 0.0) AS avg_magnitude,
            COALESCE(MAX(mag), 0.0) AS max_magnitude
        FROM curated.earthquakes_curated
        WHERE time >= CURRENT_TIMESTAMP - (:hours || ' hours')::interval
        GROUP BY date_trunc('hour', time)
        ORDER BY date_trunc('hour', time) ASC;
    """)
    t_rows = db.execute(sql_timeline, {"hours": hours}).fetchall()
    if not t_rows:
        sql_t_fb = text("""
            SELECT
                to_char(date_trunc('hour', time), 'YYYY-MM-DD HH24:00') AS time_bucket,
                COUNT(*) AS count,
                COALESCE(AVG(mag), 0.0) AS avg_magnitude,
                COALESCE(MAX(mag), 0.0) AS max_magnitude
            FROM curated.earthquakes_curated
            GROUP BY date_trunc('hour', time)
            ORDER BY date_trunc('hour', time) ASC
            LIMIT 24;
        """)
        t_rows = db.execute(sql_t_fb).fetchall()

    timeline = [
        {
            "time_bucket": r[0],
            "count": int(r[1]),
            "avg_magnitude": round(float(r[2]), 2),
            "max_magnitude": round(float(r[3]), 2),
        }
        for r in t_rows
    ]

    # 2. Magnitude Distribution matching AnalyticsCharts
    sql_mag = text("""
        SELECT
            CASE
                WHEN mag < 3.0 THEN '< 3.0'
                WHEN mag >= 3.0 AND mag < 4.5 THEN '3.0 - 4.5'
                WHEN mag >= 4.5 AND mag < 6.0 THEN '4.5 - 6.0'
                ELSE '>= 6.0'
            END AS bucket,
            COUNT(*) AS count
        FROM curated.earthquakes_curated
        GROUP BY 1;
    """)
    m_rows = db.execute(sql_mag).fetchall()
    buckets_dict = {"< 3.0": 0, "3.0 - 4.5": 0, "4.5 - 6.0": 0, ">= 6.0": 0}
    for r in m_rows:
        if r[0] in buckets_dict:
            buckets_dict[r[0]] = int(r[1])

    magnitude_distribution = [
        {"bucket": k, "count": v} for k, v in buckets_dict.items()
    ]

    # 3. Top Regions
    sql_regions = text("""
        SELECT
            COALESCE(
                NULLIF(split_part(place, ', ', 2), ''),
                NULLIF(split_part(place, ' of ', 2), ''),
                place
            ) AS region,
            COUNT(*) AS count,
            COALESCE(AVG(mag), 0.0) AS avg_magnitude
        FROM curated.earthquakes_curated
        WHERE place IS NOT NULL AND place != ''
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 6;
    """)
    r_rows = db.execute(sql_regions).fetchall()
    top_regions = [
        {
            "region": r[0] or "Océano / Global",
            "count": int(r[1]),
            "avg_magnitude": round(float(r[2]), 1),
        }
        for r in r_rows
    ]

    return {
        "timeline": timeline,
        "magnitude_distribution": magnitude_distribution,
        "top_regions": top_regions,
    }


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


@router.get("/anomalies")
def get_seismic_anomalies(
    limit: int = 50,
    current_user: dict = Depends(require_role(["viewer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Retorna el registro histórico y reciente de anomalías sísmicas y
    enjambres detectados (Swarm Events) mediante Z-Score y agrupamiento geodésico Haversine.
    """
    try:
        sql = text("""
            SELECT id, anomaly_type, region, event_id, cluster_size, latitude, longitude,
                   radius_km, z_score, max_magnitude, severity, explanation, detected_at
            FROM curated.seismic_anomalies
            ORDER BY detected_at DESC
            LIMIT :limit;
        """)
        rows = db.execute(sql, {"limit": limit}).fetchall()
        return [
            {
                "id": r[0],
                "type": r[1],
                "region": r[2],
                "event_id": r[3],
                "cluster_size": int(r[4] or 1),
                "latitude": float(r[5]) if r[5] is not None else None,
                "longitude": float(r[6]) if r[6] is not None else None,
                "radius_km": float(r[7]) if r[7] is not None else None,
                "z_score": float(r[8]) if r[8] is not None else None,
                "max_magnitude": float(r[9]) if r[9] is not None else None,
                "severity": r[10],
                "explanation": r[11],
                "detected_at": r[12].isoformat() if r[12] else None
            }
            for r in rows
        ]
    except Exception:
        return []
