"""
Validador Numérico Estricto contra Alucinaciones de IA.
Compara las cifras contenidas en el texto redactado por el LLM contra las métricas
exactas calculadas previamente por el código en Python/SQL.
Si se detecta una divergencia numérica, rechaza el texto para activar el reintento o fallback.
"""

import logging
import re
from typing import Any, Dict, List, Tuple

logger = logging.getLogger(__name__)


def extract_numbers_from_text(text: str) -> List[float]:
    """Extrae todos los números (enteros o flotantes) presentes en el texto."""
    raw_nums = re.findall(r"\b\d+(?:\.\d+)?\b", text)
    nums = []
    for n in raw_nums:
        try:
            nums.append(float(n))
        except ValueError:
            pass
    return nums


def validate_ai_report_numbers(
    generated_text: str,
    calculated_metrics: Dict[str, Any]
) -> Tuple[bool, str]:
    """
    Verifica que las cifras clave en el texto coincidan con los datos calculados:
    - Magnitud máxima calculada
    - Conteo total de eventos
    - Total de alertas de tsunami
    """
    if not generated_text or not generated_text.strip():
        return False, "El texto generado está vacío"

    max_mag_expected = float(calculated_metrics.get("max_magnitude", 0.0))
    total_events_expected = int(calculated_metrics.get("total_events_24h", 0))
    tsunami_alerts_expected = int(calculated_metrics.get("tsunami_alerts_count", 0))

    # 1. Validar menciones de magnitud
    # Busca patrones como "magnitud 6.2", "magnitud de 6.2", "M 6.2", "6.2 de magnitud"
    mag_matches = re.findall(r"(?:magnitud(?:es)?(?:\s+(?:de|máxima|de\s+hasta))?\s*|M\s*)(\d+(?:\.\d+)?)", generated_text, re.IGNORECASE)
    if mag_matches:
        extracted_mags = [float(m) for m in mag_matches]
        max_extracted = max(extracted_mags)
        # Si el texto menciona una magnitud superior a la máxima real (+ tolerancia de 0.1), es una alucinación
        if max_extracted > max_mag_expected + 0.1:
            err = (
                f"Alucinación de magnitud detectada: el texto cita magnitud {max_extracted}, "
                f"pero la máxima calculada fue {max_mag_expected}."
            )
            logger.warning(err)
            return False, err

    # 2. Validar que la magnitud máxima calculada esté explícitamente mencionada en el texto
    if max_mag_expected > 0.0:
        # El número de magnitud máxima (ej: 5.2 o 5.20) debe aparecer en el texto
        pattern_exact = rf"\b{max_mag_expected}\b"
        pattern_round = rf"\b{round(max_mag_expected, 1)}\b"
        if not re.search(pattern_exact, generated_text) and not re.search(pattern_round, generated_text):
            err = f"La magnitud máxima calculada ({max_mag_expected}) no fue mencionada en el texto del reporte."
            logger.warning(err)
            return False, err

    # 3. Validar el conteo total de eventos
    # Busca menciones como "150 sismos", "150 eventos", "total de 150"
    event_matches = re.findall(r"(\d+)\s*(?:eventos|sismos|terremotos|temblores)", generated_text, re.IGNORECASE)
    if event_matches:
        extracted_counts = [int(c) for c in event_matches]
        # Si alguno menciona el total de eventos y difiere del real
        if total_events_expected not in extracted_counts and total_events_expected > 0:
            # Comprobar si el número total aparece en alguna parte del texto
            if not re.search(rf"\b{total_events_expected}\b", generated_text):
                err = (
                    f"Discrepancia en conteo total de sismos: se esperaban {total_events_expected} eventos, "
                    f"pero el texto menciona: {extracted_counts}."
                )
                logger.warning(err)
                return False, err

    # 4. Validar alertas de tsunami si son 0
    if tsunami_alerts_expected == 0:
        # Si se esperaban 0 alertas, no debería haber frases como "3 alertas de tsunami"
        tsunami_num_matches = re.findall(r"(\d+)\s*(?:alerta(?:s)?\s+de\s+tsunami)", generated_text, re.IGNORECASE)
        for t_match in tsunami_num_matches:
            if int(t_match) > 0:
                err = f"Alucinación de alerta de tsunami: el texto afirma '{t_match} alertas de tsunami' cuando el cálculo oficial es 0."
                logger.warning(err)
                return False, err

    logger.info("✅ Validación numérica de IA aprobada exitosamente.")
    return True, "Validación numérica de IA conforme a las métricas oficiales"
