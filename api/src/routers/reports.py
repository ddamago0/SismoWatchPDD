"""
Router de Reportes de Inteligencia Artificial y Exportación.
Accesible para roles: viewer, admin.
"""

import io
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
import pandas as pd

from src.auth.dependencies import require_role
from src.database import get_db
from src.schemas.reports import AIReport

router = APIRouter(prefix="/api/reports", tags=["Reportes"])


@router.get("", response_model=List[AIReport])
def list_reports(
    limit: int = Query(15, ge=1, le=100),
    current_user: dict = Depends(require_role(["viewer", "admin"])),
    db: Session = Depends(get_db)
):
    """Retorna el historial de reportes diarios generados con IA."""
    sql = text("""
        SELECT
            id, report_date, title, summary_narrative, top_regions,
            max_magnitude_event, total_events_24h, avg_magnitude,
            tsunami_alerts_count, anomalies_detected, provider_used,
            validation_passed, created_at
        FROM curated.ai_reports
        ORDER BY report_date DESC
        LIMIT :limit;
    """)
    rows = db.execute(sql, {"limit": limit}).fetchall()
    return [
        AIReport(
            id=r[0],
            report_date=r[1],
            title=r[2],
            summary_narrative=r[3],
            top_regions=r[4] if isinstance(r[4], list) else [],
            max_magnitude_event=r[5] if isinstance(r[5], dict) else {},
            total_events_24h=int(r[6]),
            avg_magnitude=float(r[7]),
            tsunami_alerts_count=int(r[8]),
            anomalies_detected=r[9] if isinstance(r[9], list) else [],
            provider_used=r[10],
            validation_passed=bool(r[11]),
            created_at=r[12]
        )
        for r in rows
    ]


@router.get("/export")
def export_reports(
    format: str = Query("csv", pattern="^(csv|html)$"),
    current_user: dict = Depends(require_role(["viewer", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Exportación de eventos o reportes sísmicos en formato CSV o HTML descargable.
    """
    sql = text("""
        SELECT
            id, mag, place, time, longitude, latitude, depth_km,
            tsunami, status, alert
        FROM curated.earthquakes_curated
        ORDER BY time DESC
        LIMIT 1000;
    """)
    rows = db.execute(sql).fetchall()
    df = pd.DataFrame(rows, columns=[
        "id", "magnitud", "ubicacion", "fecha_utc", "longitud", "latitud",
        "profundidad_km", "alerta_tsunami", "estado", "alerta"
    ])

    if format == "csv":
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        response = Response(content=stream.getvalue(), media_type="text/csv")
        response.headers["Content-Disposition"] = "attachment; filename=sismowatch_eventos_curated.csv"
        return response

    # Exportación HTML / Documento imprimible
    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>SismoWatch - Reporte de Eventos Curados</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #1e293b; }}
            h1 {{ color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }}
            th, td {{ border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }}
            th {{ background-color: #f1f5f9; font-weight: 600; }}
            tr:nth-child(even) {{ background-color: #f8fafc; }}
            .badge {{ display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px; }}
            .badge-high {{ background-color: #fee2e2; color: #ef4444; }}
        </style>
    </head>
    <body>
        <h1>🌐 SismoWatch - Reporte Oficial de Eventos Curados</h1>
        <p>Generado para rol: <strong>{current_user['role']}</strong> ({current_user['username']}) | Total exportado: {len(df)} eventos</p>
        <table>
            <thead>
                <tr>
                    <th>ID</th><th>Magnitud</th><th>Lugar</th><th>Fecha UTC</th><th>Coordenadas</th><th>Profundidad</th><th>Tsunami</th>
                </tr>
            </thead>
            <tbody>
                {''.join([f"<tr><td>{r['id']}</td><td><strong>{r['magnitud']}</strong></td><td>{r['ubicacion']}</td><td>{r['fecha_utc']}</td><td>{r['latitud']}, {r['longitud']}</td><td>{r['profundidad_km']} km</td><td>{'SÍ' if r['alerta_tsunami'] else 'NO'}</td></tr>" for _, r in df.iterrows()])}
            </tbody>
        </table>
    </body>
    </html>
    """
    response = Response(content=html_content, media_type="text/html")
    response.headers["Content-Disposition"] = "attachment; filename=sismowatch_reporte.html"
    return response
