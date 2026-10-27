"""
Pruebas unitarias de Linaje de Datos, Conciliación Medallion y Enjambres Sísmicos (Fase 2 Plus).
"""

import math
import pytest
from airflow.include.anomaly_detection import haversine_km, detect_seismic_swarms, detect_seismic_anomalies


def test_haversine_distance_calculation():
    """Valida el cálculo de distancia geodésica mediante Haversine."""
    # Coordenadas aproximadas Bogotá (4.7110, -74.0721) a Medellín (6.2442, -75.5812) ~ 240 km
    lat1, lon1 = 4.7110, -74.0721
    lat2, lon2 = 6.2442, -75.5812
    dist = haversine_km(lat1, lon1, lat2, lon2)
    assert 220 < dist < 260
    assert haversine_km(lat1, lon1, lat1, lon1) == 0.0


def test_detect_seismic_swarms_clustered():
    """Valida la detección de enjambres sísmicos (Swarm Events) con 3 o más sismos cercanos."""
    # 4 sismos concentrados en la falla de San Andrés (radio < 30 km) en la misma ventana
    clustered_events = [
        {"id": "s1", "latitude": 34.05, "longitude": -118.25, "mag": 3.2, "place": "Los Angeles, CA"},
        {"id": "s2", "latitude": 34.08, "longitude": -118.28, "mag": 3.8, "place": "Los Angeles, CA"},
        {"id": "s3", "latitude": 34.02, "longitude": -118.22, "mag": 4.1, "place": "Los Angeles, CA"},
        {"id": "s4", "latitude": 34.06, "longitude": -118.24, "mag": 2.9, "place": "Los Angeles, CA"},
    ]
    swarms = detect_seismic_swarms(clustered_events, max_radius_km=50.0, min_cluster_size=3)
    assert len(swarms) == 1
    swarm = swarms[0]
    assert swarm["type"] == "SEISMIC_SWARM_EVENT"
    assert swarm["cluster_size"] == 4
    assert swarm["max_magnitude"] == 4.1
    assert swarm["radius_km"] < 25.0
    assert "Enjambre sísmico" in swarm["explanation"]


def test_detect_seismic_swarms_dispersed():
    """Valida que sismos geográficamente distantes (> 200 km) no formen un enjambre falso."""
    dispersed_events = [
        {"id": "d1", "latitude": 34.05, "longitude": -118.25, "mag": 3.2, "place": "California"},
        {"id": "d2", "latitude": 61.21, "longitude": -149.90, "mag": 3.8, "place": "Alaska"},
        {"id": "d3", "latitude": 19.43, "longitude": -99.13, "mag": 4.1, "place": "Mexico City"},
    ]
    swarms = detect_seismic_swarms(dispersed_events, max_radius_km=75.0, min_cluster_size=3)
    assert len(swarms) == 0


def test_detect_seismic_anomalies_combines_swarms_and_spikes():
    """Valida que la suite analítica integre tanto picos Z-Score como enjambres espaciales."""
    events = [
        # Enjambre en California
        {"id": "c1", "latitude": 34.05, "longitude": -118.25, "mag": 3.2, "place": "California"},
        {"id": "c2", "latitude": 34.06, "longitude": -118.26, "mag": 3.5, "place": "California"},
        {"id": "c3", "latitude": 34.07, "longitude": -118.27, "mag": 3.9, "place": "California"},
        # Evento de alta magnitud
        {"id": "h1", "latitude": 38.00, "longitude": 142.00, "mag": 6.8, "place": "Japan", "tsunami": 1},
    ]
    anomalies = detect_seismic_anomalies(events, z_threshold=2.0)
    types = [a["type"] for a in anomalies]
    assert "SEISMIC_SWARM_EVENT" in types
    assert "HIGH_MAGNITUDE_EVENT" in types
