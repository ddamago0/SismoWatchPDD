"""
Generador determinístico de reportes por plantilla.
Se activa automáticamente si los proveedores de IA (Gemini y Groq) fallan,
exceden el tiempo de respuesta o el validador detecta alucinaciones numéricas.
Garantiza 100% de disponibilidad y exactitud matemática en el pipeline.
"""

from typing import Any, Dict, List


def generate_deterministic_daily_report(data: Dict[str, Any]) -> str:
    """Genera un reporte markdown profesional y exacto a partir de métricas precalculadas."""
    report_date = data.get("report_date", "N/A")
    total_events = data.get("total_events_24h", 0)
    max_mag = data.get("max_magnitude", 0.0)
    max_place = data.get("max_magnitude_place", "Sin ubicación reportada")
    avg_mag = data.get("avg_magnitude", 0.0)
    tsunami_count = data.get("tsunami_alerts_count", 0)
    top_regions = data.get("top_regions", [])
    anomalies = data.get("anomalies", [])

    # Formatear regiones
    regions_md = ""
    if top_regions:
        for idx, r in enumerate(top_regions[:5], 1):
            regions_md += f"- **{r.get('region', 'Desconocida')}**: {r.get('count', 0)} eventos (magnitud máxima: {r.get('max_mag', 0.0)})\n"
    else:
        regions_md = "- No se registraron concentraciones significativas en el periodo.\n"

    # Formatear anomalías
    anomalies_md = ""
    if anomalies:
        for a in anomalies:
            anomalies_md += f"- **{a.get('type', 'ALERTA')}** en *{a.get('region', 'N/A')}*: {a.get('explanation', '')}\n"
    else:
        anomalies_md = "- Los niveles de frecuencia y magnitud se mantienen dentro de los parámetros estadísticos habituales (Z-score < 2.0).\n"

    # Severidad del evento máximo
    if max_mag >= 6.0:
        severidad_text = "ALTA SEVERIDAD - Monitoreo prioritario activado."
    elif max_mag >= 4.5:
        severidad_text = "MODERADA - Sin impacto generalizado a infraestructura."
    else:
        severidad_text = "BAJA - Actividad microsísmica habitual."

    clean_place = str(max_place).replace('"', '').strip()

    return f"""## 1. Resumen de Situación
Durante las últimas 24 horas correspondientes a la fecha **{report_date}**, la plataforma SismoWatch registró y validó un total de **{total_events} eventos sísmicos** a nivel global. La magnitud promedio observada fue de **{avg_mag}**, evidenciando un comportamiento general dentro de los márgenes operacionales esperados para la red de monitoreo.

## 2. Eventos Destacados y Máxima Severidad
- **Evento de mayor energía**: Magnitud **{max_mag}** localizado en **{clean_place}**.
- **Evaluación de severidad**: {severidad_text}
- **Alertas de tsunami emitidas**: **{tsunami_count}** alertas activas registradas en los sistemas de alerta temprana.

## 3. Zonas con Mayor Concentración Sísmica
Las siguientes áreas geográficas presentaron la mayor frecuencia de eventos en el periodo evaluado:
{regions_md}
## 4. Anomalías Operativas y Recomendaciones de Riesgo
{anomalies_md}
### Recomendaciones para Operaciones SuperApp:
1. Mantener protocolos de contingencia activos en las regiones con Z-score elevado.
2. Verificar la continuidad de servicios en centros de distribución y nodos logísticos cercanos al epicentro del evento de magnitud {max_mag}.
3. Continuar el seguimiento en tiempo real mediante el dashboard de SismoWatch.
"""
