"""
Agente Analítico Inteligente para SismoWatch (Inspirado en Medallion Agent).
Implementa cascada de inferencia multi-proveedor (Groq LLaMA 3.3 / GPT-OSS -> Gemini 3.8 Flash -> Motor Determinístico).
Garantiza generación de consultas Text-to-SQL seguras validadas por AST y síntesis narrativa de resultados.
"""

import os
import re
import json
import logging
import requests
from typing import Dict, Any, List, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.services.sql_guard import validate_read_only_sql, SQLSecurityError

logger = logging.getLogger(__name__)

# Esquema de metadatos analíticos para dar contexto al LLM
SCHEMA_PROMPT_CONTEXT = """
Esquema de la base de datos PostgreSQL 16 (Medallion Lakehouse):
- curated.earthquakes_curated:
    id (VARCHAR PRIMARY KEY): Identificador oficial USGS
    mag (NUMERIC(4,2)): Magnitud sísmica en escala Richter / Mw
    place (TEXT): Descripción geográfica del epicentro
    time (TIMESTAMPTZ): Fecha y hora del evento en UTC
    updated (TIMESTAMPTZ): Última actualización de la solución sísmica
    url (TEXT): Enlace al evento en USGS
    felt (INT): Número de reportes de personas que sintieron el sismo
    cdi (NUMERIC(3,1)): Intensidad comunitaria de internet
    mmi (NUMERIC(3,1)): Intensidad instrumental máxima modificada de Mercalli
    alert (VARCHAR): Nivel de alerta PAGER (green, yellow, orange, red)
    status (VARCHAR): Estado de revisión (reviewed, automatic)
    tsunami (INT): 1 si hay alerta o potencial de tsunami, 0 si no
    sig (INT): Significancia del evento sísmico (0 a 1000)
    mag_type (VARCHAR): Tipo de magnitud (mw, mwr, mwb, mb, ml, etc.)
    type (VARCHAR): Tipo de evento sísmico (earthquake, quarry blast)
    title (TEXT): Título descriptivo
    longitude (NUMERIC(9,6)): Longitud en grados [-180, 180]
    latitude (NUMERIC(8,6)): Latitud en grados [-90, 90]
    depth_km (NUMERIC(6,2)): Profundidad focal en kilómetros

- curated.seismic_anomalies:
    id (SERIAL PRIMARY KEY)
    event_id (VARCHAR)
    type (VARCHAR): 'SEISMIC_SWARM_EVENT' o 'STATISTICAL_ENERGY_SPIKE'
    region (TEXT)
    cluster_size (INT): Cantidad de sismos agrupados
    radius_km (NUMERIC): Radio del enjambre
    max_magnitude (NUMERIC): Magnitud pico del racimo
    explanation (TEXT)

- curated.quality_results:
    quality_score (NUMERIC): Puntuación de calidad Pandera (0-100)
    total_records (INT), records_passed (INT), records_rejected (INT)
    freshness_lag_seconds (INT), evaluated_at (TIMESTAMPTZ)
"""


class SismoAiAgent:
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
        self.groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()

    def process_query(self, user_text: str, db: Session) -> Dict[str, Any]:
        """Procesa una consulta conversacional, técnica o Text-to-SQL de extremo a extremo."""
        clean_text = user_text.strip()
        lower_text = clean_text.lower()

        # 1. Detección de saludos o preguntas de capacidades
        if self._is_greeting(lower_text):
            return {
                "sender": "bot",
                "status": "success",
                "reply": (
                    "¡Hola! Soy **SismoBot**, el asistente analítico inteligente de **SismoWatch**.\n\n"
                    "Puedo responder preguntas en lenguaje natural sobre sismos globales, ejecutar consultas SQL "
                    "seguras sobre la capa Curated, y reportar alertas de tsunami o enjambres sísmicos.\n\n"
                    "**Prueba preguntándome:**\n"
                    "- *¿Cuál fue el sismo más fuerte en las últimas 48 horas?*\n"
                    "- *¿Cuántos sismos con alerta de tsunami existen?*\n"
                    "- *Top 5 regiones con mayor actividad sísmica*\n"
                    "- *Promedio general de magnitud y profundidad*\n"
                    "- *¿Cuál es el estado de calidad de datos de Pandera?*"
                ),
                "data": [],
                "columns": [],
                "row_count": 0,
                "executed_sql": None,
                "provider_used": "Asistente Operativo SismoWatch"
            }

        # 2. Detección de preguntas de arquitectura / linaje / catálogo
        if self._is_architecture_query(lower_text):
            return {
                "sender": "bot",
                "status": "success",
                "reply": (
                    "**Arquitectura Medallion de SismoWatch:**\n\n"
                    "- **Bronze (`raw.usgs_earthquakes_raw`):** Ingesta cruda append-only del feed GeoJSON de USGS cada 5 minutos vía Apache Airflow.\n"
                    "- **Silver (`staging.earthquakes_staging`):** Limpieza tabular, aplanado y tipado de coordenadas y fechas UTC.\n"
                    "- **Quality Gate Pandera:** 7 reglas determinísticas (ISO/IEC 25012). Registros anómalos son aislados en `curated.quality_quarantine`.\n"
                    "- **Gold (`curated.earthquakes_curated`):** Hechos sísmicos 100% verificados e indexados para consumo analítico y tiempo real (SSE).\n"
                    "- **Detección de Enjambres:** Agrupamiento geodésico Haversine (swarms $\\ge 3$ eventos en radio $\\le 75$ km y $\\Delta t \\le 2$ horas)."
                ),
                "data": [],
                "columns": [],
                "row_count": 0,
                "executed_sql": None,
                "provider_used": "Gobernanza Medallion"
            }

        # 3. Generación de SQL (Text-to-SQL)
        provider_used = "Motor Determinístico AST"
        sql_candidate = None

        # Si el usuario ya escribió un SELECT directo, usarlo
        if lower_text.startswith("select "):
            sql_candidate = clean_text
            provider_used = "SQL Directo"
        else:
            # Intentar generar SQL mediante LLM (Groq / Gemini)
            llm_sql, llm_prov = self._generate_sql_with_llm(clean_text)
            if llm_sql:
                sql_candidate = llm_sql
                provider_used = llm_prov
            else:
                # Fallback determinístico con reglas semánticas
                sql_candidate = self._deterministic_text_to_sql(lower_text)
                provider_used = "Traductor Semántico"

        # 4. Validación estricta por AST (sql_guard)
        try:
            safe_sql = validate_read_only_sql(sql_candidate, max_limit=100)
        except SQLSecurityError as sec_err:
            return {
                "sender": "bot",
                "status": "security_block",
                "reply": f"⚠️ **Política de Seguridad Bloqueante**: La consulta fue rechazada por el motor AST: {str(sec_err)}",
                "data": [],
                "columns": [],
                "row_count": 0,
                "executed_sql": sql_candidate,
                "provider_used": "AST Security Guard"
            }

        # 5. Ejecución segura en base de datos (Transacción Read Only)
        try:
            db.execute(text("SET TRANSACTION READ ONLY;"))
            result = db.execute(text(safe_sql))
            columns = list(result.keys())
            rows = [dict(zip(columns, row)) for row in result.fetchall()]
        except Exception as db_err:
            logger.error("Error al ejecutar consulta SQL en BD: %s", str(db_err))
            return {
                "sender": "bot",
                "status": "error",
                "reply": f"❌ **Error al consultar la base de datos**: {str(db_err)}",
                "data": [],
                "columns": [],
                "row_count": 0,
                "executed_sql": safe_sql,
                "provider_used": provider_used
            }

        # 6. Generación de síntesis narrativa inteligente (Narrative Summary)
        narrative_reply = self._generate_narrative(clean_text, safe_sql, rows, provider_used)

        return {
            "sender": "bot",
            "status": "success",
            "reply": narrative_reply,
            "question": clean_text,
            "executed_sql": safe_sql,
            "row_count": len(rows),
            "columns": columns,
            "data": rows,
            "provider_used": provider_used
        }

    def _is_greeting(self, text: str) -> bool:
        greetings = ["hola", "buenas", "buenos dias", "buenas tardes", "hello", "hi", "que puedes hacer", "ayuda", "help", "quien eres"]
        return any(text == g or text.startswith(g + " ") for g in greetings)

    def _is_architecture_query(self, text: str) -> bool:
        keywords = ["esquema", "tablas", "medallion", "linaje", "lineage", "catalogo", "arquitectura", "capas"]
        return any(k in text for k in keywords) and not any(k in text for k in ["sismo", "mag", "terremoto", "tsunami", "fuerte"])

    def _generate_sql_with_llm(self, question: str) -> tuple[Optional[str], Optional[str]]:
        """Invoca a Groq o Gemini para traducir lenguaje natural a SQL."""
        prompt = (
            f"Eres un traductor experto de lenguaje natural a SQL para PostgreSQL 16.\n"
            f"{SCHEMA_PROMPT_CONTEXT}\n\n"
            f"Reglas estrictas:\n"
            f"1. Responde ÚNICAMENTE con la sentencia SQL SELECT de PostgreSQL, sin explicaciones ni formato markdown (sin ```sql).\n"
            f"2. Solo consulta tablas del esquema 'curated'.\n"
            f"3. Si se piden sismos, ordena por 'time DESC' o 'mag DESC' según corresponda y limita con LIMIT (máx 20).\n"
            f"Pregunta: {question}\nSQL:"
        )

        # Intento 1: Groq
        if self.groq_api_key:
            try:
                resp = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.groq_api_key}", "Content-Type": "application/json"},
                    json={"model": self.groq_model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.1},
                    timeout=8
                )
                if resp.status_code == 200:
                    raw_sql = resp.json()["choices"][0]["message"]["content"].strip()
                    cleaned = re.sub(r"^```(?:sql)?\s*|\s*```$", "", raw_sql, flags=re.MULTILINE).strip()
                    if cleaned.lower().startswith("select "):
                        return cleaned, f"Groq LLaMA ({self.groq_model})"
            except Exception as e:
                logger.warning("Fallo al generar SQL con Groq: %s", str(e))

        # Intento 2: Gemini
        if self.gemini_api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_api_key}"
                resp = requests.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={"contents": [{"parts": [{"text": prompt}]}]},
                    timeout=8
                )
                if resp.status_code == 200:
                    raw_sql = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                    cleaned = re.sub(r"^```(?:sql)?\s*|\s*```$", "", raw_sql, flags=re.MULTILINE).strip()
                    if cleaned.lower().startswith("select "):
                        return cleaned, f"Google Gemini ({self.gemini_model})"
            except Exception as e:
                logger.warning("Fallo al generar SQL con Gemini: %s", str(e))

        return None, None

    def _deterministic_text_to_sql(self, t: str) -> str:
        """Traductor determinístico con reconocimiento de entidades sismológicas."""
        if any(k in t for k in ["mayor", "mas fuerte", "más fuerte", "maxima", "máxima", "fuerte", "pico", "alto"]):
            return "SELECT id, mag, place, time, depth_km FROM curated.earthquakes_curated ORDER BY mag DESC LIMIT 5"

        if "tsunami" in t:
            return "SELECT id, mag, place, time, alert, tsunami FROM curated.earthquakes_curated WHERE tsunami = 1 ORDER BY time DESC LIMIT 20"

        if any(k in t for k in ["region", "región", "lugar", "zonas", "top", "recurrencia"]):
            return "SELECT place, COUNT(*) as total_eventos, ROUND(AVG(mag)::numeric, 2) as mag_promedio FROM curated.earthquakes_curated GROUP BY place ORDER BY total_eventos DESC LIMIT 10"

        if any(k in t for k in ["promedio", "media", "estadistica", "estadística"]):
            return "SELECT ROUND(AVG(mag)::numeric, 2) as magnitud_promedio, ROUND(AVG(depth_km)::numeric, 2) as profundidad_promedio_km, COUNT(*) as total_evaluados FROM curated.earthquakes_curated"

        if any(k in t for k in ["profund", "hondo"]):
            return "SELECT id, mag, place, depth_km, time FROM curated.earthquakes_curated ORDER BY depth_km DESC LIMIT 10"

        if any(k in t for k in ["enjambre", "swarm", "cluster", "anomalia", "anomalía"]):
            return "SELECT region, cluster_size, radius_km, max_magnitude, explanation FROM curated.seismic_anomalies ORDER BY id DESC LIMIT 5"

        if any(k in t for k in ["calidad", "score", "pandera", "cuarentena", "evaluacion", "evaluación"]):
            return "SELECT quality_score, total_records, records_passed, records_rejected, freshness_lag_seconds, evaluated_at FROM curated.quality_results ORDER BY evaluated_at DESC LIMIT 5"

        # Default: sismos recientes
        return "SELECT id, mag, place, time, depth_km, alert FROM curated.earthquakes_curated ORDER BY time DESC LIMIT 15"

    def _generate_narrative(self, question: str, sql: str, rows: List[Dict[str, Any]], provider_used: str) -> str:
        """Genera una respuesta explicativa en español utilizando el LLM o un sintetizador estructurado."""
        if not rows:
            return "Se ejecutó la consulta en la capa **curated**, pero no se encontraron registros que coincidan con los criterios."

        # Intentar sintetizar con Groq
        if self.groq_api_key and len(rows) > 0:
            sample_data = json.dumps(rows[:5], default=str, ensure_ascii=False)
            prompt = (
                f"Eres el analista de datos sismológicos SismoBot.\n"
                f"Pregunta del usuario: '{question}'\n"
                f"Datos obtenidos de PostgreSQL (primeros registros):\n{sample_data}\n\n"
                f"Escribe un breve resumen analítico en español (máximo 2 párrafos) respondiendo directamente la pregunta. "
                f"Destaca en **negrita** cifras clave como magnitudes, lugares y fechas. Sé claro y profesional."
            )
            try:
                resp = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.groq_api_key}", "Content-Type": "application/json"},
                    json={"model": self.groq_model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.2},
                    timeout=8
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"].strip()
            except Exception as e:
                logger.warning("Fallo en síntesis narrativa Groq: %s", str(e))

        # Síntesis determinística rica si el LLM no está disponible
        first = rows[0]
        count = len(rows)

        if "mag" in first and "place" in first:
            return (
                f"Se analizaron los registros de la capa Curated. El evento principal identificado se localiza en "
                f"**{first.get('place')}** con una magnitud de **{first.get('mag')} Mw** y profundidad de "
                f"**{first.get('depth_km', '—')} km**. Se recuperaron un total de **{count} registros** analíticos."
            )

        if "total_eventos" in first and "place" in first:
            return (
                f"La zona con mayor recurrencia es **{first.get('place')}** con un total de "
                f"**{first.get('total_eventos')} sismos** y una magnitud promedio de **{first.get('mag_promedio')} Mw**."
            )

        if "magnitud_promedio" in first:
            return (
                f"En la ventana analizada, la magnitud promedio calculada es de **{first.get('magnitud_promedio')} Mw**, "
                f"con una profundidad promedio de **{first.get('profundidad_promedio_km')} km** sobre un total de "
                f"**{first.get('total_evaluados')} eventos** certificados."
            )

        if "quality_score" in first:
            return (
                f"El último chequeo de calidad determinística Pandera arrojó un score de **{first.get('quality_score')}%**, "
                f"con **{first.get('records_passed')} registros certificados** y un lag de frescura de **{first.get('freshness_lag_seconds')} segundos**."
            )

        return f"Se ejecutó exitosamente la consulta SQL sobre la capa Curated, obteniendo **{count} registros**."


# Instancia singleton del agente
sismo_agent = SismoAiAgent()

