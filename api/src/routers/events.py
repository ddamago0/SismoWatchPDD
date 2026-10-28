"""
Router de Eventos Sísmicos con Filtros y Paginación.
Accesible para roles: viewer, admin.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.auth.dependencies import require_role
from src.database import get_db
from src.schemas.events import EarthquakeEvent, PaginatedEvents

router = APIRouter(prefix="/api/events", tags=["Eventos"])


@router.get("", response_model=PaginatedEvents)
def list_events(
    start_date: Optional[str] = Query(None, description="Fecha inicio YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Fecha fin YYYY-MM-DD"),
    min_magnitude: Optional[float] = Query(None, ge=-2.0, le=10.0, description="Magnitud mínima"),
    region: Optional[str] = Query(None, description="Búsqueda por texto en lugar/región"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(25, ge=1, le=500, description="Cantidad por página"),
    current_user: dict = Depends(require_role(["viewer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Retorna la lista de eventos sísmicos curados con filtros dinámicos y paginación.
    """
    conditions = ["1=1"]
    params = {}

    if start_date:
        conditions.append("time >= CAST(:start_date AS TIMESTAMP)")
        params["start_date"] = start_date
    if end_date:
        conditions.append("time <= CAST(:end_date AS TIMESTAMP) + INTERVAL '1 day'")
        params["end_date"] = end_date
    if min_magnitude is not None:
        conditions.append("mag >= :min_magnitude")
        params["min_magnitude"] = min_magnitude
    if region:
        conditions.append("place ILIKE :region")
        params["region"] = f"%{region}%"

    where_clause = " AND ".join(conditions)

    # 1. Total de registros que cumplen los filtros
    sql_count = text(f"SELECT COUNT(*) FROM curated.earthquakes_curated WHERE {where_clause}")
    total = db.execute(sql_count, params).scalar() or 0

    # 2. Registros paginados
    offset = (page - 1) * limit
    params["limit"] = limit
    params["offset"] = offset

    sql_data = text(f"""
        SELECT
            id, mag, place, time, updated, tz, url, detail, felt,
            cdi, mmi, alert, status, tsunami, sig, net, code,
            mag_type, type, title, longitude, latitude, depth_km,
            is_validated, batch_id, curated_at
        FROM curated.earthquakes_curated
        WHERE {where_clause}
        ORDER BY time DESC
        LIMIT :limit OFFSET :offset;
    """)
    rows = db.execute(sql_data, params).fetchall()

    events = [
        EarthquakeEvent(
            id=r[0],
            mag=float(r[1]),
            place=r[2],
            time=r[3],
            updated=r[4],
            tz=r[5],
            url=r[6],
            detail=r[7],
            felt=r[8],
            cdi=float(r[9]) if r[9] is not None else None,
            mmi=float(r[10]) if r[10] is not None else None,
            alert=r[11],
            status=r[12],
            tsunami=int(r[13] or 0),
            sig=r[14],
            net=r[15],
            code=r[16],
            mag_type=r[17],
            type=r[18],
            title=r[19],
            longitude=float(r[20]),
            latitude=float(r[21]),
            depth_km=float(r[22]),
            is_validated=bool(r[23]),
            batch_id=r[24],
            curated_at=r[25]
        )
        for r in rows
    ]

    return PaginatedEvents(total=total, page=page, limit=limit, events=events)
