"""
Pruebas unitarias de transformaciones GeoJSON para la capa Silver (Staging).
"""

import sys
from pathlib import Path

# Agregar raíz del proyecto al sys.path para importar airflow.include
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

from airflow.include.transformations import (
    ms_to_iso_utc,
    sanitize_text,
    safe_float,
    safe_int,
    parse_geojson_feature,
    transform_features_list,
)


def test_ms_to_iso_utc():
    # 1700000000000 ms = 2023-11-14T22:13:20+00:00
    iso_val = ms_to_iso_utc(1700000000000)
    assert iso_val is not None
    assert iso_val.startswith("2023-11-14T22:13:20")
    assert "+00:00" in iso_val or "Z" in iso_val

    # Casos nulos o inválidos
    assert ms_to_iso_utc(None) is None
    assert ms_to_iso_utc("invalid_string") is None


def test_sanitize_text():
    # Limpieza de caracteres nulos y espacios
    assert sanitize_text("  Sismo en Bogotá\x00  ") == "Sismo en Bogotá"
    assert sanitize_text("   ") is None
    assert sanitize_text(None) is None


def test_safe_float():
    assert safe_float(5.23456) == 5.2346
    assert safe_float("4.8") == 4.8
    assert safe_float(None) is None
    assert safe_float("no_num") is None
    assert safe_float(float("nan")) is None
    assert safe_float(float("inf")) is None


def test_safe_int():
    assert safe_int(1) == 1
    assert safe_int("42") == 42
    assert safe_int(None) is None
    assert safe_int("invalid") is None


def test_parse_geojson_feature():
    sample_feature = {
        "id": "us7000m999",
        "type": "Feature",
        "properties": {
            "mag": 5.4,
            "place": "12 km W of San Juan, Argentina\x00",
            "time": 1700000000000,
            "updated": 1700000050000,
            "tsunami": 0,
            "sig": 450,
            "net": "us",
            "code": "7000m999",
            "magType": "mww",
            "type": "earthquake",
            "title": "M 5.4 - San Juan, Argentina",
        },
        "geometry": {
            "type": "Point",
            "coordinates": [-68.52, -31.53, 115.4],
        },
    }

    parsed = parse_geojson_feature(sample_feature, batch_id="batch_test_01")

    assert parsed["id"] == "us7000m999"
    assert parsed["mag"] == 5.4
    assert parsed["place"] == "12 km W of San Juan, Argentina"
    assert parsed["longitude"] == -68.52
    assert parsed["latitude"] == -31.53
    assert parsed["depth_km"] == 115.4
    assert parsed["batch_id"] == "batch_test_01"
    assert parsed["time"] is not None


def test_transform_features_list():
    features = [
        {
            "id": "feat_01",
            "properties": {"mag": 3.2, "place": "Región 1", "time": 1700000000000},
            "geometry": {"coordinates": [-70.0, 10.0, 20.0]},
        },
        {
            "id": "feat_02",
            "properties": {"mag": 4.5, "place": "Región 2", "time": 1700001000000},
            "geometry": {"coordinates": [-75.0, 5.0, 10.0]},
        },
        "invalid_non_dict_feature",
    ]

    transformed = transform_features_list(features, batch_id="batch_02")
    assert len(transformed) == 2
    assert transformed[0]["id"] == "feat_01"
    assert transformed[1]["id"] == "feat_02"

