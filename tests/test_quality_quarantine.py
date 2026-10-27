"""
Pruebas de validación de calidad de datos con Pandera y desvío a cuarentena.
"""

import sys
from pathlib import Path
import pandas as pd
import pytest

repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

from airflow.include.quality import (
    validate_single_record,
    evaluate_batch_quality,
    SeismicDataFrameSchema,
)


def test_valid_record_passes():
    valid_record = {
        "id": "sismo_valido_01",
        "mag": 4.5,
        "time": "2026-10-27T08:00:00+00:00",
        "latitude": 4.57,
        "longitude": -74.29,
        "depth_km": 30.0,
    }
    is_valid, rule, reason = validate_single_record(valid_record)
    assert is_valid is True
    assert rule is None
    assert reason is None


def test_invalid_latitude_quarantined():
    corrupted_lat = {
        "id": "sismo_corrupto_lat",
        "mag": 4.5,
        "time": "2026-10-27T08:00:00+00:00",
        "latitude": 150.0,  # Inválido: máx 90.0
        "longitude": -74.29,
        "depth_km": 30.0,
    }
    is_valid, rule, reason = validate_single_record(corrupted_lat)
    assert is_valid is False
    assert rule == "GEOGRAPHIC_BOUNDS"
    assert "Latitud 150.0 fuera del rango" in reason


def test_invalid_longitude_quarantined():
    corrupted_lon = {
        "id": "sismo_corrupto_lon",
        "mag": 4.5,
        "time": "2026-10-27T08:00:00+00:00",
        "latitude": 4.57,
        "longitude": -250.0,  # Inválido: mín -180.0
        "depth_km": 30.0,
    }
    is_valid, rule, reason = validate_single_record(corrupted_lon)
    assert is_valid is False
    assert rule == "GEOGRAPHIC_BOUNDS"


def test_invalid_magnitude_quarantined():
    corrupted_mag = {
        "id": "sismo_corrupto_mag",
        "mag": 15.0,  # Imposible en escala sismológica (máx 10.5)
        "time": "2026-10-27T08:00:00+00:00",
        "latitude": 4.57,
        "longitude": -74.29,
        "depth_km": 30.0,
    }
    is_valid, rule, reason = validate_single_record(corrupted_mag)
    assert is_valid is False
    assert rule == "MAGNITUDE_BOUNDS"


def test_invalid_depth_quarantined():
    corrupted_depth = {
        "id": "sismo_corrupto_depth",
        "mag": 4.5,
        "time": "2026-10-27T08:00:00+00:00",
        "latitude": 4.57,
        "longitude": -74.29,
        "depth_km": 2000.0,  # Límite manto terrestre 1000 km
    }
    is_valid, rule, reason = validate_single_record(corrupted_depth)
    assert is_valid is False
    assert rule == "DEPTH_BOUNDS"


def test_missing_required_fields():
    missing_id = {
        "id": "",
        "mag": 4.5,
        "time": "2026-10-27T08:00:00+00:00",
        "latitude": 4.57,
        "longitude": -74.29,
        "depth_km": 30.0,
    }
    is_valid, rule, reason = validate_single_record(missing_id)
    assert is_valid is False
    assert rule == "REQUIRED_FIELDS"


def test_evaluate_batch_quality():
    batch = [
        {"id": "ok_1", "mag": 3.0, "time": "2026-10-27T08:00:00+00:00", "latitude": 10.0, "longitude": -70.0, "depth_km": 10.0},
        {"id": "ok_2", "mag": 4.0, "time": "2026-10-27T08:05:00+00:00", "latitude": 20.0, "longitude": -60.0, "depth_km": 15.0},
        {"id": "bad_lat", "mag": 5.0, "time": "2026-10-27T08:10:00+00:00", "latitude": 120.0, "longitude": -60.0, "depth_km": 15.0},
    ]

    valid, quarantine, summary = evaluate_batch_quality(batch, batch_id="batch_test")
    assert len(valid) == 2
    assert len(quarantine) == 1
    assert quarantine[0]["event_id"] == "bad_lat"
    assert quarantine[0]["rule_failed"] == "GEOGRAPHIC_BOUNDS"
    assert summary["quality_score"] == pytest.approx(66.67, 0.1)


def test_pandera_schema_valid():
    df = pd.DataFrame([
        {"id": "s1", "mag": 4.2, "time": "2026-10-27T08:00:00+00:00", "latitude": 5.0, "longitude": -75.0, "depth_km": 20.0},
        {"id": "s2", "mag": 6.1, "time": "2026-10-27T08:10:00+00:00", "latitude": 6.0, "longitude": -74.0, "depth_km": 40.0},
    ])
    validated_df = SeismicDataFrameSchema.validate(df)
    assert len(validated_df) == 2
