"""
Cliente Multi-Provider de Inteligencia Artificial para SismoWatch.
Implementa una cascada de resiliencia de 3 niveles:
  1. Google Gemini API (Proveedor Primario)
  2. Groq API - LLaMA 3.3 (Proveedor Secundario / Failover)
  3. Motor Determinístico por Plantilla (Fallback de Contingencia)

Garantías:
- Cero alucinaciones numéricas: validación estricta de cifras antes de persistir.
- Sanitización de texto contra prompt injection.
- Telemetría completa de tokens, latencia y costos en curated.ai_runs.
- El pipeline NUNCA se interrumpe por fallos de IA.
"""

from datetime import datetime, timezone
import json
import logging
import os
import re
import time
from typing import Any, Dict, Optional, Tuple

import psycopg2
from psycopg2.extras import Json

from airflow.include.ai.fallback_templates import generate_deterministic_daily_report
from airflow.include.ai.validator import validate_ai_report_numbers
from airflow.include.db_utils import get_db_connection

logger = logging.getLogger(__name__)


def record_ai_run_telemetry(
    run_id: str,
    task_type: str,
    provider: str,
    model_name: str,
    latency_ms: int,
    status: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    cost_estimate_usd: float = 0.0,
    error_message: Optional[str] = None
) -> None:
    """Registra la telemetría y auditoría de la ejecución en curated.ai_runs."""
    total_tokens = prompt_tokens + completion_tokens
    sql = """
        INSERT INTO curated.ai_runs
            (run_id, task_type, provider, model_name, prompt_tokens, completion_tokens,
             total_tokens, latency_ms, cost_estimate_usd, status, error_message, executed_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP);
    """
    try:
        conn = get_db_connection(role="transform")
        with conn.cursor() as cur:
            cur.execute(
                sql,
                (
                    run_id,
                    task_type,
                    provider,
                    model_name,
                    prompt_tokens,
                    completion_tokens,
                    total_tokens,
                    latency_ms,
                    round(cost_estimate_usd, 6),
                    status.upper(),
                    error_message
                )
            )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error("Error al registrar telemetría en curated.ai_runs: %s", str(e))


def sanitize_input_data(text: Any) -> str:
    """Sanitiza campos de texto externos (mitigación OWASP Prompt Injection)."""
    if text is None:
        return ""
    s = str(text)
    # Reemplazar delimitadores que pudieran intentar romper el prompt
    s = s.replace("\x00", "").replace("```", "'''")
    # Limitar longitud para prevenir desbordamiento de contexto
    return s[:250].strip()


def build_daily_report_prompt(metrics: Dict[str, Any]) -> str:
    """Carga y rellena la plantilla del prompt versionado en airflow/include/ai/prompts/."""
    prompt_path = os.path.join(os.path.dirname(__file__), "prompts", "daily_report_v1.txt")
    with open(prompt_path, "r", encoding="utf-8") as f:
        template = f.read()

    # Formatear top regiones de manera segura
    top_regions = metrics.get("top_regions", [])
    regions_formatted = ""
    for r in top_regions[:5]:
        reg_name = sanitize_input_data(r.get("region", "Desconocida"))
        regions_formatted += f"  - {reg_name}: {r.get('count', 0)} sismos (máx mag: {r.get('max_mag', 0.0)})\n"

    # Formatear anomalías
    anomalies = metrics.get("anomalies", [])
    anomalies_formatted = ""
    for a in anomalies:
        a_reg = sanitize_input_data(a.get("region", "N/A"))
        a_exp = sanitize_input_data(a.get("explanation", ""))
        anomalies_formatted += f"  - [{a.get('severity', 'MEDIA')}] {a.get('type', 'ALERTA')} en {a_reg}: {a_exp}\n"

    if not anomalies_formatted:
        anomalies_formatted = "  - Sin anomalías críticas detectadas en el periodo (actividad normal).\n"

    return template.format(
        report_date=metrics.get("report_date", "N/A"),
        total_events_24h=metrics.get("total_events_24h", 0),
        max_magnitude=metrics.get("max_magnitude", 0.0),
        max_magnitude_place=sanitize_input_data(metrics.get("max_magnitude_place", "N/A")),
        avg_magnitude=metrics.get("avg_magnitude", 0.0),
        tsunami_alerts_count=metrics.get("tsunami_alerts_count", 0),
        top_regions_formatted=regions_formatted,
        anomalies_formatted=anomalies_formatted,
    )


def call_gemini_api(prompt: str, run_id: str, timeout_seconds: int = 12) -> Tuple[Optional[str], int, int, int]:
    """Llama a Google Gemini API mediante google-genai o requests HTTPS directo."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or "your_gemini" in api_key:
        raise ValueError("GEMINI_API_KEY no configurada o inválida")

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    start_time = time.time()

    # Intento 1: SDK oficial google-genai
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )
        latency_ms = int((time.time() - start_time) * 1000)
        text = response.text or ""
        # Estimación o lectura de tokens
        prompt_tokens = len(prompt.split()) * 2
        completion_tokens = len(text.split()) * 2
        return text, latency_ms, prompt_tokens, completion_tokens
    except Exception as e:
        logger.warning("Fallo en llamada SDK Gemini: %s. Probando fallback HTTPS...", str(e))

    # Intento 2: Endpoint REST directo con requests
    import requests
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 2048}
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=timeout_seconds)
    latency_ms = int((time.time() - start_time) * 1000)
    if resp.status_code != 200:
        raise RuntimeError(f"Gemini REST API falló con código {resp.status_code}: {resp.text[:200]}")
    
    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise RuntimeError("Gemini no retornó candidatos de respuesta")
    text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    usage = data.get("usageMetadata", {})
    prompt_tokens = usage.get("promptTokenCount", len(prompt.split()) * 2)
    completion_tokens = usage.get("candidatesTokenCount", len(text.split()) * 2)
    return text, latency_ms, prompt_tokens, completion_tokens


def call_groq_api(prompt: str, run_id: str, timeout_seconds: int = 12) -> Tuple[Optional[str], int, int, int]:
    """Llama a Groq API (LLaMA 3.3) como proveedor secundario de alta velocidad."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or "your_groq" in api_key:
        raise ValueError("GROQ_API_KEY no configurada o inválida")

    model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    start_time = time.time()

    from groq import Groq
    client = Groq(api_key=api_key, timeout=timeout_seconds)
    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model=model_name,
        temperature=0.2,
        max_tokens=2048,
    )
    latency_ms = int((time.time() - start_time) * 1000)
    choice = chat_completion.choices[0]
    text = choice.message.content or ""
    usage = chat_completion.usage
    p_tokens = usage.prompt_tokens if usage else len(prompt.split()) * 2
    c_tokens = usage.completion_tokens if usage else len(text.split()) * 2
    return text, latency_ms, p_tokens, c_tokens


def generate_executive_report_resilient(
    metrics: Dict[str, Any],
    run_id: str
) -> Dict[str, Any]:
    """
    Coordina la generación del reporte ejecutivo mediante la cascada de proveedores:
    1. Gemini API -> Si responde y pasa validación de cifras -> Retorna.
    2. Si Gemini falla o alucina -> Groq API (LLaMA 3.3).
    3. Si Groq falla o alucina -> Plantilla Determinística (100% fiable).
    """
    prompt = build_daily_report_prompt(metrics)
    prompt_tokens_est = len(prompt.split()) * 2

    # --- NIVEL 1: GOOGLE GEMINI ---
    try:
        logger.info("[IA Nivel 1] Intentando generación con Google Gemini...")
        text_gemini, latency, p_tok, c_tok = call_gemini_api(prompt, run_id)
        # Validación numérica
        valid, reason = validate_ai_report_numbers(text_gemini, metrics)
        if valid:
            cost = (p_tok * 0.00000015) + (c_tok * 0.0000006)
            record_ai_run_telemetry(
                run_id=run_id,
                task_type="daily_report",
                provider="gemini",
                model_name=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                latency_ms=latency,
                status="SUCCESS",
                prompt_tokens=p_tok,
                completion_tokens=c_tok,
                cost_estimate_usd=cost
            )
            return {
                "narrative": text_gemini,
                "provider": "gemini",
                "validation_passed": True,
                "latency_ms": latency
            }
        else:
            logger.warning("[IA Nivel 1] Gemini alucinó cifras: %s. Activando failover a Groq...", reason)
            record_ai_run_telemetry(
                run_id=run_id,
                task_type="daily_report",
                provider="gemini",
                model_name=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                latency_ms=latency,
                status="VALIDATION_FAILED",
                error_message=reason
            )
    except Exception as e_gemini:
        logger.warning("[IA Nivel 1] Error contactando Gemini: %s. Activando failover a Groq...", str(e_gemini))
        record_ai_run_telemetry(
            run_id=run_id,
            task_type="daily_report",
            provider="gemini",
            model_name=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            latency_ms=0,
            status="ERROR",
            error_message=str(e_gemini)
        )

    # --- NIVEL 2: GROQ (LLaMA 3.3) ---
    try:
        logger.info("[IA Nivel 2] Intentando generación con Groq (LLaMA 3.3)...")
        text_groq, latency_groq, p_tok_g, c_tok_g = call_groq_api(prompt, run_id)
        valid_g, reason_g = validate_ai_report_numbers(text_groq, metrics)
        if valid_g:
            cost_g = (p_tok_g * 0.00000059) + (c_tok_g * 0.00000079)
            record_ai_run_telemetry(
                run_id=run_id,
                task_type="daily_report",
                provider="groq",
                model_name=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                latency_ms=latency_groq,
                status="SUCCESS",
                prompt_tokens=p_tok_g,
                completion_tokens=c_tok_g,
                cost_estimate_usd=cost_g
            )
            return {
                "narrative": text_groq,
                "provider": "groq",
                "validation_passed": True,
                "latency_ms": latency_groq
            }
        else:
            logger.warning("[IA Nivel 2] Groq alucinó cifras: %s. Activando fallback determinístico...", reason_g)
            record_ai_run_telemetry(
                run_id=run_id,
                task_type="daily_report",
                provider="groq",
                model_name=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                latency_ms=latency_groq,
                status="VALIDATION_FAILED",
                error_message=reason_g
            )
    except Exception as e_groq:
        logger.warning("[IA Nivel 2] Error contactando Groq: %s. Activando fallback determinístico...", str(e_groq))
        record_ai_run_telemetry(
            run_id=run_id,
            task_type="daily_report",
            provider="groq",
            model_name=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            latency_ms=0,
            status="ERROR",
            error_message=str(e_groq)
        )

    # --- NIVEL 3: FALLBACK DETERMINÍSTICO POR PLANTILLA ---
    logger.info("[IA Nivel 3] Generando reporte determinístico por plantilla (100% de exactitud garantizada)...")
    start_fb = time.time()
    fallback_narrative = generate_deterministic_daily_report(metrics)
    latency_fb = int((time.time() - start_fb) * 1000)

    record_ai_run_telemetry(
        run_id=run_id,
        task_type="daily_report",
        provider="template_fallback",
        model_name="deterministic_template_v1",
        latency_ms=latency_fb,
        status="SUCCESS",
        prompt_tokens=prompt_tokens_est,
        completion_tokens=len(fallback_narrative.split()) * 2,
        cost_estimate_usd=0.0
    )

    return {
        "narrative": fallback_narrative,
        "provider": "template_fallback",
        "validation_passed": True,
        "latency_ms": latency_fb
    }
