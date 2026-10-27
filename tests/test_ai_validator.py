"""
Pruebas del Validador Anti-Alucinación Numérico para Reportes de IA.
"""

import sys
from pathlib import Path

repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

from airflow.include.ai.validator import (
    extract_numbers_from_text,
    validate_ai_report_numbers,
)


def test_extract_numbers_from_text():
    text = "Se registraron 124 eventos sísmicos con magnitud máxima de 6.4 y 1 alerta de tsunami."
    nums = extract_numbers_from_text(text)
    assert 124.0 in nums
    assert 6.4 in nums
    assert 1.0 in nums


def test_valid_ai_report_numbers_passes():
    metrics = {
        "max_magnitude": 6.2,
        "total_events_24h": 45,
        "tsunami_alerts_count": 0,
    }
    valid_text = (
        "Durante las últimas 24 horas se registraron 45 eventos sísmicos en la red de monitoreo. "
        "El sismo más potente alcanzó una magnitud de 6.2 en la región del Pacífico. "
        "No se reportaron alertas de tsunami para los centros logísticos."
    )
    passed, reason = validate_ai_report_numbers(valid_text, metrics)
    assert passed is True
    assert "conforme a las métricas oficiales" in reason


def test_hallucinated_magnitude_rejected():
    metrics = {
        "max_magnitude": 5.1,
        "total_events_24h": 20,
        "tsunami_alerts_count": 0,
    }
    # El LLM alucina un terremoto adicional con magnitud 7.9 cuando el real fue 5.1
    hallucinated_text = (
        "Se detectaron 20 eventos con magnitud 5.1, pero además se registró magnitud 7.9 en la costa."
    )
    passed, reason = validate_ai_report_numbers(hallucinated_text, metrics)
    assert passed is False
    assert "Alucinación de magnitud detectada" in reason


def test_missing_maximum_magnitude_rejected():
    metrics = {
        "max_magnitude": 6.8,
        "total_events_24h": 50,
        "tsunami_alerts_count": 0,
    }
    # El LLM menciona los 50 eventos pero omite la magnitud máxima 6.8
    omitted_mag_text = (
        "Resumen operativo: Un total de 50 sismos fueron registrados sin incidentes mayores reportados."
    )
    passed, reason = validate_ai_report_numbers(omitted_mag_text, metrics)
    assert passed is False
    assert "no fue mencionada en el texto" in reason


def test_hallucinated_tsunami_rejected():
    metrics = {
        "max_magnitude": 5.5,
        "total_events_24h": 30,
        "tsunami_alerts_count": 0,  # Cero alertas reales
    }
    # El LLM inventa que hubo 2 alertas de tsunami
    hallucinated_tsunami = (
        "Se confirmaron 30 eventos sísmicos con magnitud máxima 5.5. "
        "Se emitieron 2 alertas de tsunami en las zonas costeras."
    )
    passed, reason = validate_ai_report_numbers(hallucinated_tsunami, metrics)
    assert passed is False
    assert "Alucinación de alerta de tsunami" in reason


def test_empty_report_rejected():
    metrics = {"max_magnitude": 4.0, "total_events_24h": 10, "tsunami_alerts_count": 0}
    passed, reason = validate_ai_report_numbers("   ", metrics)
    assert passed is False
    assert "está vacío" in reason
