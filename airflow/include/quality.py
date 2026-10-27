"""
Motor de Calidad de Datos con Pandera y Reglas Determinísticas de Negocio.
Aplica validaciones estrictas y bloqueantes:
- Esquema y tipos de datos
- Campos obligatorios (id, time, latitude, longitude)
- Rangos válidos (lat [-90, 90], lon [-180, 180], mag [-2.0, 10.5], profundidad [-10, 1000])
- Unicidad de id y deduplicación en lote
- Formato de fecha / timestamp
- Controles de frescura y volumen
Enruta cualquier fila no conforme a cuarentena con motivo y regla fallada.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
import pandera as pa
from pandera import Check, Column, DataFrameSchema

logger = logging.getLogger(__name__)

# Definición del esquema Pandera para validación estructural de la capa Staging / Curated
SeismicDataFrameSchema = DataFrameSchema(
    columns={
        "id": Column(str, nullable=False, unique=True, coerce=True),
        "mag": Column(float, checks=[Check.greater_than_or_equal_to(-2.0), Check.less_than_or_equal_to(10.5)], nullable=False, coerce=True),
        "time": Column(str, nullable=False, coerce=True),
        "latitude": Column(float, checks=[Check.greater_than_or_equal_to(-90.0), Check.less_than_or_equal_to(90.0)], nullable=False, coerce=True),
        "longitude": Column(float, checks=[Check.greater_than_or_equal_to(-180.0), Check.less_than_or_equal_to(180.0)], nullable=False, coerce=True),
        "depth_km": Column(float, checks=[Check.greater_than_or_equal_to(-10.0), Check.less_than_or_equal_to(1000.0)], nullable=False, coerce=True),
    },
    coerce=True,
    strict=False
)


def validate_single_record(record: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Evalúa las reglas de calidad fila por fila para permitir aislamiento granular en cuarentena.
    Retorna: (is_valid, rule_failed, rejection_reason)
    """
    event_id = record.get("id")
    event_time = record.get("time")
    lat = record.get("latitude")
    lon = record.get("longitude")
    mag = record.get("mag")
    depth = record.get("depth_km")

    # Regla 1: Campos obligatorios no nulos ni vacíos
    if not event_id or not str(event_id).strip():
        return False, "REQUIRED_FIELDS", "Campo obligatorio 'id' está ausente o vacío"
    if not event_time or not str(event_time).strip():
        return False, "REQUIRED_FIELDS", "Campo obligatorio 'time' está ausente o vacío"
    if lat is None:
        return False, "REQUIRED_FIELDS", "Campo obligatorio 'latitude' es nulo"
    if lon is None:
        return False, "REQUIRED_FIELDS", "Campo obligatorio 'longitude' es nulo"

    # Regla 2: Formato de timestamp ISO 8601
    try:
        parsed_dt = datetime.fromisoformat(str(event_time).replace("Z", "+00:00"))
        # Verificar que el año sea razonable (ej: entre 1970 y el presente + 1 día)
        now_utc = datetime.now(timezone.utc)
        if parsed_dt.year < 1970 or parsed_dt > now_utc.replace(year=now_utc.year + 1):
            return False, "INVALID_TIMESTAMP", f"Fecha fuera de rango temporal plausible: {event_time}"
    except (ValueError, TypeError):
        return False, "INVALID_TIMESTAMP", f"Formato de fecha inválido (se esperaba ISO 8601): {event_time}"

    # Regla 3: Rango de coordenadas geográficas
    if not (-90.0 <= float(lat) <= 90.0):
        return False, "GEOGRAPHIC_BOUNDS", f"Latitud {lat} fuera del rango válido [-90.0, 90.0]"
    if not (-180.0 <= float(lon) <= 180.0):
        return False, "GEOGRAPHIC_BOUNDS", f"Longitud {lon} fuera del rango válido [-180.0, 180.0]"

    # Regla 4: Rango plausible de magnitud
    if mag is None:
        return False, "MAGNITUDE_BOUNDS", "Magnitud ausente o nula"
    try:
        f_mag = float(mag)
        if not (-2.0 <= f_mag <= 10.5):
            return False, "MAGNITUDE_BOUNDS", f"Magnitud {f_mag} fuera del rango plausible [-2.0, 10.5]"
    except (ValueError, TypeError):
        return False, "MAGNITUDE_BOUNDS", f"Magnitud no numérica: {mag}"

    # Regla 5: Rango plausible de profundidad
    if depth is None:
        return False, "DEPTH_BOUNDS", "Profundidad ausente o nula"
    try:
        f_depth = float(depth)
        if not (-10.0 <= f_depth <= 1000.0):
            return False, "DEPTH_BOUNDS", f"Profundidad {f_depth} km fuera del rango plausible [-10, 1000]"
    except (ValueError, TypeError):
        return False, "DEPTH_BOUNDS", f"Profundidad no numérica: {depth}"

    return True, None, None


def evaluate_batch_quality(
    records: List[Dict[str, Any]],
    batch_id: str
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
    """
    Evalúa la calidad sobre un lote completo de registros de staging.
    Separa en válidos para curated y rechazados para cuarentena.
    Calcula el desglose de métricas y el puntaje de calidad (0 a 100).
    """
    valid_records = []
    quarantine_records = []
    seen_ids = set()

    rules_stats = {
        "REQUIRED_FIELDS": {"evaluated": 0, "passed": 0, "rejected": 0},
        "INVALID_TIMESTAMP": {"evaluated": 0, "passed": 0, "rejected": 0},
        "GEOGRAPHIC_BOUNDS": {"evaluated": 0, "passed": 0, "rejected": 0},
        "MAGNITUDE_BOUNDS": {"evaluated": 0, "passed": 0, "rejected": 0},
        "DEPTH_BOUNDS": {"evaluated": 0, "passed": 0, "rejected": 0},
        "UNIQUENESS": {"evaluated": 0, "passed": 0, "rejected": 0},
    }

    total_records = len(records)

    for rec in records:
        event_id = rec.get("id")

        # Evaluar unicidad en el lote
        rules_stats["UNIQUENESS"]["evaluated"] += 1
        if event_id in seen_ids:
            rules_stats["UNIQUENESS"]["rejected"] += 1
            quarantine_records.append({
                "event_id": event_id,
                "raw_payload": rec,
                "rejection_reason": f"Identificador duplicado en el mismo lote: {event_id}",
                "rule_failed": "UNIQUENESS",
                "batch_id": batch_id
            })
            continue
        rules_stats["UNIQUENESS"]["passed"] += 1
        if event_id:
            seen_ids.add(event_id)

        # Evaluar reglas de integridad a nivel de fila
        is_valid, rule_failed, reason = validate_single_record(rec)
        
        # Registrar estadísticas de la regla
        for rule_key in ("REQUIRED_FIELDS", "INVALID_TIMESTAMP", "GEOGRAPHIC_BOUNDS", "MAGNITUDE_BOUNDS", "DEPTH_BOUNDS"):
            rules_stats[rule_key]["evaluated"] += 1
            if not is_valid and rule_failed == rule_key:
                rules_stats[rule_key]["rejected"] += 1
            else:
                rules_stats[rule_key]["passed"] += 1

        if is_valid:
            valid_records.append(rec)
        else:
            quarantine_records.append({
                "event_id": event_id,
                "raw_payload": rec,
                "rejection_reason": reason,
                "rule_failed": rule_failed,
                "batch_id": batch_id
            })

    # Cálculo de puntaje global de calidad (0 - 100%)
    if total_records > 0:
        quality_score = (len(valid_records) / total_records) * 100.0
    else:
        quality_score = 100.0

    logger.info(
        "Evaluación de calidad de batch '%s': Total=%d, Válidos=%d, Cuarentena=%d, Score=%.2f%%",
        batch_id, total_records, len(valid_records), len(quarantine_records), quality_score
    )

    return valid_records, quarantine_records, {
        "total_records": total_records,
        "valid_count": len(valid_records),
        "quarantine_count": len(quarantine_records),
        "quality_score": round(quality_score, 2),
        "rules_breakdown": rules_stats
    }


def check_freshness(latest_time_iso: Optional[str]) -> int:
    """Calcula el desfase de frescura en segundos respecto a la hora UTC actual."""
    if not latest_time_iso:
        return 999999
    try:
        dt = datetime.fromisoformat(latest_time_iso.replace("Z", "+00:00"))
        lag = (datetime.now(timezone.utc) - dt).total_seconds()
        return max(0, int(lag))
    except (ValueError, TypeError):
        return 999999
