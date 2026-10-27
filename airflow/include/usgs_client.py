"""
USGS Earthquake API Client.
Maneja la extracción segura, con timeouts y reintentos, tanto del feed en tiempo
casi real (all_hour.geojson) como del catálogo histórico parametrizado (FDSNWS).
"""

import logging
import time
from typing import Any, Dict, Optional
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

USGS_LIVE_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"
USGS_QUERY_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"


class USGSUnavailableError(Exception):
    """Excepción específica cuando el servicio de USGS no responde o devuelve 5xx."""
    pass


def get_resilient_session(retries: int = 3, backoff_factor: float = 1.0) -> requests.Session:
    """Crea una sesión requests con reintentos automáticos para errores de red transitorios."""
    session = requests.Session()
    retry_strategy = Retry(
        total=retries,
        backoff_factor=backoff_factor,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
        raise_on_status=False
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def fetch_live_events(timeout_seconds: int = 15) -> Dict[str, Any]:
    """
    Descarga el feed GeoJSON de sismos de la última hora desde USGS.
    Lanza USGSUnavailableError si el servicio falla o no responde en el timeout.
    """
    logger.info("Iniciando descarga de feed en vivo USGS: %s", USGS_LIVE_URL)
    session = get_resilient_session()
    start_time = time.time()
    try:
        response = session.get(USGS_LIVE_URL, timeout=timeout_seconds)
        elapsed = time.time() - start_time
        if response.status_code != 200:
            logger.error("USGS API respondió con código %s en %.2fs: %s", response.status_code, elapsed, response.text[:200])
            raise USGSUnavailableError(f"USGS feed falló con HTTP {response.status_code}")
        
        payload = response.json()
        features = payload.get("features", [])
        logger.info("Descarga exitosa de USGS: %d eventos obtenidos en %.2fs", len(features), elapsed)
        return payload
    except requests.exceptions.Timeout as e:
        logger.error("Timeout al contactar USGS tras %ds: %s", timeout_seconds, str(e))
        raise USGSUnavailableError(f"Timeout al conectar con USGS API ({timeout_seconds}s)") from e
    except requests.exceptions.RequestException as e:
        logger.error("Error de conexión al contactar USGS: %s", str(e))
        raise USGSUnavailableError(f"Error de red al conectar con USGS API: {str(e)}") from e


def fetch_historical_events(
    start_time: str,
    end_time: str,
    min_magnitude: float = 2.5,
    timeout_seconds: int = 45
) -> Dict[str, Any]:
    """
    Consulta sismos históricos vía FDSNWS en formato GeoJSON.
    Ejemplo: start_time='2026-09-27', end_time='2026-10-27', min_magnitude=2.5
    """
    params = {
        "format": "geojson",
        "starttime": start_time,
        "endtime": end_time,
        "minmagnitude": min_magnitude,
    }
    logger.info("Consultando histórico USGS FDSNWS con parámetros: %s", params)
    session = get_resilient_session(retries=3, backoff_factor=1.5)
    start_t = time.time()
    try:
        response = session.get(USGS_QUERY_URL, params=params, timeout=timeout_seconds)
        elapsed = time.time() - start_t
        if response.status_code != 200:
            logger.error("USGS FDSNWS falló con código %s: %s", response.status_code, response.text[:200])
            raise USGSUnavailableError(f"FDSNWS query falló con HTTP {response.status_code}")
        
        payload = response.json()
        features = payload.get("features", [])
        logger.info("Descarga histórica exitosa: %d eventos obtenidos en %.2fs", len(features), elapsed)
        return payload
    except requests.exceptions.RequestException as e:
        logger.error("Error al consultar FDSNWS histórico: %s", str(e))
        raise USGSUnavailableError(f"Error en consulta histórica USGS: {str(e)}") from e
