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

    # Exportación HTML / Documento Print-Ready con soporte nativo de impresión a PDF
    max_mag = float(df["magnitud"].max()) if not df.empty else 0.0
    avg_mag = round(float(df["magnitud"].mean()), 2) if not df.empty else 0.0
    tsunami_count = int((df["alerta_tsunami"] == 1).sum()) if not df.empty else 0

    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SismoWatch - Boletín Oficial de Eventos Sísmicos</title>
    <style>
        @page {{
            size: A4 portrait;
            margin: 1.5cm;
        }}
        @media print {{
            body {{
                font-size: 10pt;
                color: #000;
                background: #fff;
            }}
            .no-print {{
                display: none !important;
            }}
            .page-break {{
                page-break-before: always;
            }}
            table {{
                page-break-inside: auto;
            }}
            tr {{
                page-break-inside: avoid;
                page-break-after: auto;
            }}
            thead {{
                display: table-header-group;
            }}
            .kpi-card {{
                border: 1px solid #cbd5e1 !important;
                box-shadow: none !important;
            }}
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 30px;
            background-color: #f8fafc;
            color: #1e293b;
            line-height: 1.4;
        }}
        .container {{
            max-width: 1000px;
            margin: 0 auto;
            background: #ffffff;
            padding: 32px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }}
        .brand {{
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .badge-role {{
            background: #e0f2fe;
            color: #0369a1;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
        }}
        .kpi-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }}
        .kpi-card {{
            background: #f1f5f9;
            padding: 14px;
            border-radius: 6px;
            border-left: 4px solid #0284c7;
        }}
        .kpi-label {{
            font-size: 11px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
            margin-bottom: 4px;
        }}
        .kpi-value {{
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
        }}
        .btn-print {{
            background: #0284c7;
            color: #ffffff;
            border: none;
            padding: 10px 18px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
        }}
        .btn-print:hover {{
            background: #0369a1;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 12px;
        }}
        th, td {{
            border: 1px solid #e2e8f0;
            padding: 8px 10px;
            text-align: left;
        }}
        th {{
            background-color: #f8fafc;
            color: #334155;
            font-weight: 700;
        }}
        tr:nth-child(even) {{
            background-color: #f8fafc;
        }}
        .mag-badge {{
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 11px;
        }}
        .mag-high {{ background: #fee2e2; color: #b91c1c; }}
        .mag-med {{ background: #fef3c7; color: #b45309; }}
        .mag-low {{ background: #dcfce7; color: #15803d; }}
        .footer {{
            margin-top: 28px;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end;">
            <button class="btn-print" onclick="window.print()">
                🖨️ Imprimir / Guardar como PDF
            </button>
        </div>

        <div class="header">
            <div>
                <div class="brand">🌍 SismoWatch — SuperApp Operations</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
                    Boletín Ejecutivo Oficial de Monitoreo y Calidad Sísmica
                </div>
            </div>
            <div style="text-align: right;">
                <span class="badge-role">Rol: {current_user['role']}</span>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
                    Generado: {pd.Timestamp.now(tz='UTC').strftime('%Y-%m-%d %H:%M:%S UTC')}
                </div>
            </div>
        </div>

        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Eventos Exportados</div>
                <div class="kpi-value">{len(df)}</div>
            </div>
            <div class="kpi-card" style="border-left-color: #ef4444;">
                <div class="kpi-label">Magnitud Máxima</div>
                <div class="kpi-value" style="color: #b91c1c;">{max_mag}</div>
            </div>
            <div class="kpi-card" style="border-left-color: #f59e0b;">
                <div class="kpi-label">Magnitud Promedio</div>
                <div class="kpi-value">{avg_mag}</div>
            </div>
            <div class="kpi-card" style="border-left-color: #06b6d4;">
                <div class="kpi-label">Alertas Tsunami</div>
                <div class="kpi-value">{tsunami_count}</div>
            </div>
        </div>

        <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: #0f172a;">
            Registro Oficial de Eventos Validados (Capa Gold)
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 140px;">ID</th>
                    <th style="width: 70px;">Mag</th>
                    <th>Ubicación / Bounding Box</th>
                    <th style="width: 150px;">Fecha y Hora (UTC)</th>
                    <th style="width: 110px;">Profundidad</th>
                    <th style="width: 70px;">Tsunami</th>
                </tr>
            </thead>
            <tbody>
                {''.join([
                    f"<tr>"
                    f"<td style='font-family: monospace;'>{r['id']}</td>"
                    f"<td><span class='mag-badge {'mag-high' if r['magnitud'] >= 5.0 else ('mag-med' if r['magnitud'] >= 3.5 else 'mag-low')}'>{r['magnitud']}</span></td>"
                    f"<td>{r['ubicacion']}</td>"
                    f"<td>{str(r['fecha_utc'])[:19]}</td>"
                    f"<td>{r['profundidad_km']} km</td>"
                    f"<td style='text-align: center;'>{'⚠️ SÍ' if r['alerta_tsunami'] else 'No'}</td>"
                    f"</tr>"
                    for _, r in df.iterrows()
                ])}
            </tbody>
        </table>

        <div class="footer">
            SismoWatch PDD — Plataforma de Arquitectura Medallion y Gobernanza de Datos. Clasificación: Uso Operacional SuperApp.
        </div>
    </div>
</body>
</html>"""
    response = Response(content=html_content, media_type="text/html")
    response.headers["Content-Disposition"] = "inline; filename=sismowatch_reporte_ejecutivo.html"
    return response
