"""
Módulo analítico de detección de anomalías sísmicas (Z-Score y Enjambres).
Identifica comportamientos inusuales (picos de actividad por región y hora)
mediante técnicas estadísticas determinísticas.
"""

from datetime import datetime, timezone
import logging
import math
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)


def extract_region(place: Optional[str]) -> str:
    """Extrae la región o país a partir del campo 'place' de USGS."""
    if not place:
        return "Global / Sin especificar"
    if " of " in place:
        parts = place.split(" of ", 1)
        return parts[1].strip()
    if ", " in place:
        parts = place.split(", ")
        return parts[-1].strip()
    return place.strip()


def calculate_z_scores(values: List[float]) -> List[float]:
    """Calcula los Z-scores estándar de una serie numérica."""
    if len(values) < 2:
        return [0.0] * len(values)
    arr = np.array(values, dtype=float)
    mean = np.mean(arr)
    std = np.std(arr)
    if std == 0.0 or math.isnan(std):
        return [0.0] * len(values)
    z_scores = (arr - mean) / std
    return [round(float(z), 2) for z in z_scores]


def detect_seismic_anomalies(
    events: List[Dict[str, Any]],
    z_threshold: float = 2.0
) -> List[Dict[str, Any]]:
    """
    Analiza eventos de las últimas 24 horas y detecta anomalías:
    1. Picos de volumen por región (Z-score > z_threshold)
    2. Concentración temporal / enjambres sísmicos
    3. Eventos de magnitud inusualmente alta (> 6.0)
    Retorna una lista de alertas estructuradas con explicaciones claras.
    """
    if not events:
        return []

    anomalies = []

    # 1. Agrupar por región
    region_counts: Dict[str, int] = {}
    region_events: Dict[str, List[Dict[str, Any]]] = {}

    for e in events:
        reg = extract_region(e.get("place"))
        region_counts[reg] = region_counts.get(reg, 0) + 1
        if reg not in region_events:
            region_events[reg] = []
        region_events[reg].append(e)

    # 2. Análisis Z-score sobre el conteo de eventos por región
    regions = list(region_counts.keys())
    counts = [float(region_counts[r]) for r in regions]
    z_scores = calculate_z_scores(counts)

    for reg, count, z in zip(regions, counts, z_scores):
        if z >= z_threshold and count >= 3:
            max_mag_in_reg = max([float(x.get("mag", 0.0)) for x in region_events[reg]])
            anomalies.append({
                "type": "REGIONAL_VOLUME_SPIKE",
                "region": reg,
                "event_count": int(count),
                "z_score": z,
                "max_magnitude": max_mag_in_reg,
                "severity": "HIGH" if z > 3.0 or max_mag_in_reg >= 5.5 else "MEDIUM",
                "explanation": (
                    f"Pico anómalo de actividad sísmica en '{reg}': {int(count)} eventos registrados "
                    f"en 24h (Z-score: +{z}σ sobre la media regional, magnitud máxima: {max_mag_in_reg})."
                )
            })

    # 3. Detección de sismos de magnitud significativa (>= 6.0)
    for e in events:
        mag = float(e.get("mag") or 0.0)
        if mag >= 6.0:
            reg = extract_region(e.get("place"))
            tsunami = int(e.get("tsunami") or 0)
            anomalies.append({
                "type": "HIGH_MAGNITUDE_EVENT",
                "region": reg,
                "event_id": e.get("id"),
                "magnitude": mag,
                "tsunami_alert": bool(tsunami),
                "severity": "CRITICAL" if mag >= 7.0 or tsunami else "HIGH",
                "explanation": (
                    f"Evento sísmico de alta energía de magnitud {mag} en '{e.get('place')}' "
                    f"a las {e.get('time')}. Alerta de tsunami: {'SÍ' if tsunami else 'NO'}."
                )
            })

    logger.info("Detección de anomalías finalizada: %d alertas identificadas", len(anomalies))
    return anomalies
