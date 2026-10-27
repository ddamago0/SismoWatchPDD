"""
Módulo de transformaciones de datos para la capa Silver (Staging).
Convierte eventos GeoJSON crudos de USGS en estructuras tabulares limpias,
normalizadas y fuertemente tipadas.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import math


def ms_to_iso_utc(timestamp_ms: Optional[int]) -> Optional[str]:
    """Convierte un timestamp epoch en milisegundos a cadena ISO 8601 UTC."""
    if timestamp_ms is None or not isinstance(timestamp_ms, (int, float)):
        return None
    try:
        dt = datetime.fromtimestamp(timestamp_ms / 1000.0, tz=timezone.utc)
        return dt.isoformat()
    except (ValueError, OverflowError, OSError):
        return None


def sanitize_text(text: Optional[str]) -> Optional[str]:
    """Limpia cadenas de texto y elimina caracteres nulos o de control."""
    if text is None:
        return None
    s = str(text).replace("\x00", "").strip()
    return s if s else None


def safe_float(val: Any) -> Optional[float]:
    """Convierte a float de forma segura; retorna None si es inf o nan."""
    if val is None:
        return None
    try:
        f = float(val)
        return None if (math.isnan(f) or math.isinf(f)) else round(f, 4)
    except (ValueError, TypeError):
        return None


def safe_int(val: Any) -> Optional[int]:
    """Convierte a int de forma segura."""
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def parse_geojson_feature(feature: Dict[str, Any], batch_id: str) -> Dict[str, Any]:
    """
    Transforma un Feature GeoJSON individual en un diccionario estructurado
    para la capa staging.
    """
    event_id = feature.get("id")
    props = feature.get("properties") or {}
    geom = feature.get("geometry") or {}
    coords = geom.get("coordinates") or [None, None, None]

    # Extraer coordenadas: [longitud, latitud, profundidad_km]
    lon = safe_float(coords[0]) if len(coords) > 0 else None
    lat = safe_float(coords[1]) if len(coords) > 1 else None
    depth = safe_float(coords[2]) if len(coords) > 2 else None

    # Tiempos en UTC
    event_time = ms_to_iso_utc(props.get("time"))
    updated_time = ms_to_iso_utc(props.get("updated"))

    return {
        "id": event_id,
        "mag": safe_float(props.get("mag")),
        "place": sanitize_text(props.get("place")),
        "time": event_time,
        "updated": updated_time,
        "tz": safe_int(props.get("tz")),
        "url": sanitize_text(props.get("url")),
        "detail": sanitize_text(props.get("detail")),
        "felt": safe_int(props.get("felt")),
        "cdi": safe_float(props.get("cdi")),
        "mmi": safe_float(props.get("mmi")),
        "alert": sanitize_text(props.get("alert")),
        "status": sanitize_text(props.get("status")),
        "tsunami": safe_int(props.get("tsunami")) or 0,
        "sig": safe_int(props.get("sig")),
        "net": sanitize_text(props.get("net")),
        "code": sanitize_text(props.get("code")),
        "ids": sanitize_text(props.get("ids")),
        "sources": sanitize_text(props.get("sources")),
        "types": sanitize_text(props.get("types")),
        "nst": safe_int(props.get("nst")),
        "dmin": safe_float(props.get("dmin")),
        "rms": safe_float(props.get("rms")),
        "gap": safe_float(props.get("gap")),
        "mag_type": sanitize_text(props.get("magType")),
        "type": sanitize_text(props.get("type")),
        "title": sanitize_text(props.get("title")),
        "longitude": lon,
        "latitude": lat,
        "depth_km": depth,
        "batch_id": batch_id,
    }


def transform_features_list(features: List[Dict[str, Any]], batch_id: str) -> List[Dict[str, Any]]:
    """Transforma una lista de features GeoJSON a una lista de diccionarios planos."""
    return [parse_geojson_feature(f, batch_id) for f in features if isinstance(f, dict)]
