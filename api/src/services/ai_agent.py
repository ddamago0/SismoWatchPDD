"""
Agente Analítico Inteligente para SismoWatch (SismoBot).
Combina:
1. Blindaje contra Inyecciones de Prompt (OWASP LLM01:2025) y Sanitización Unicode.
2. Frontera Estricta de Dominio (Rechazo formal de temas no relacionados con sismología).
3. Inyección de Hechos y Contexto Ground-Truth en Tiempo Real desde PostgreSQL Gold/Curated.
4. Generación de Reportes Ejecutivos Estructurados y Memoria Conversacional Multi-Turno.
5. Traducción Segura Text-to-SQL con Validación AST (sql_guard) y Síntesis Narrativa.
6. Preguntas de Seguimiento Dinámicas (suggested_questions).
"""

import os
import re
import time
import json
import logging
import unicodedata
import requests
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.services.sql_guard import validate_read_only_sql, SQLSecurityError

logger = logging.getLogger(__name__)

# Patrones de inyección de prompt (OWASP LLM01:2025)
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"disregard\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"system\s*override",
    r"you\s+are\s+now\s+(a\s+)?hacker",
    r"dan\s+mode",
    r"jailbreak",
    r"forget\s+everything",
    r"drop\s+table",
    r"delete\s+from",
    r"truncate\s+table",
    r"<script.*?>.*?</script>",
    r"exec\s*\(",
]

# Temas fuera de dominio estrictamente no autorizados
OUT_OF_DOMAIN_KEYWORDS = [
    "receta", "cocina", "cocinar", "pastel", "empanada", "ingrediente",
    "politica", "política", "presidente", "elecciones", "partido politico",
    "chiste", "cuento", "poema", "poesía", "cancion", "canción",
    "futbol", "fútbol", "partido de", "campeonato", "messi", "ronaldo",
    "criptomoneda", "bitcoin", "ethereum", "acciones bolsa", "invertir en",
    "tarea de historia", "tarea de matematicas", "tarea escolar",
    "escribe un exploit", "crea un virus", "hackear", "phishing",
]

DEFAULT_SUGGESTIONS = [
    "¿Dónde hay más sismos?",
    "¿Cuál es el lugar con menor actividad?",
    "Genérame un reporte ejecutivo de las últimas 24h",
    "¿Cuáles son las anomalías estadísticas recientes?",
]

REJECTION_MESSAGE = (
    "Como asistente especializado de SismoWatch, mi labor se limita exclusivamente al análisis de actividad sísmica, "
    "eventos tectónicos, monitoreo geológico en la capa Curated y arquitectura Medallion. No estoy autorizado para "
    "responder sobre otros temas. Si deseas consultar datos sobre magnitudes, regiones activas o reportes sísmicos, con gusto te asisto."
)

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


def sanitize_message(text_str: str) -> str:
    """Sanitiza el input del usuario contra inyecciones y caracteres de control."""
    if not text_str:
        return ""
    # Normalizar Unicode (NFKC)
    cleaned = unicodedata.normalize("NFKC", str(text_str))
    # Neutralizar patrones de inyección
    for pattern in INJECTION_PATTERNS:
        cleaned = re.sub(pattern, "[FILTRADO_POR_SEGURIDAD]", cleaned, flags=re.IGNORECASE)
    # Remover caracteres de control excepto saltos de línea y tabulación
    cleaned = "".join(ch for ch in cleaned if ch.isprintable() or ch in "\n\t")
    return cleaned.strip()[:1000]


def is_out_of_domain(clean_text: str) -> bool:
    """Detecta si la consulta está completamente fuera del dominio sismológico."""
    lower = clean_text.lower()
    for kw in OUT_OF_DOMAIN_KEYWORDS:
        if kw in lower:
            return True
    return False


def get_live_seismic_facts(db: Session) -> Dict[str, Any]:
    """Extrae hechos sísmicos en tiempo real desde la capa curated para contextualizar a SismoBot."""
    try:
        # 1. KPIs 24 horas
        kpi_res = db.execute(text("""
            SELECT
                COUNT(*) AS total_24h,
                COALESCE(MAX(mag), 0.0) AS max_mag_24h,
                ROUND(COALESCE(AVG(mag), 0.0)::numeric, 2) AS avg_mag_24h,
                COALESCE(SUM(CASE WHEN tsunami = 1 THEN 1 ELSE 0 END), 0) AS tsunami_alerts_24h,
                (SELECT place FROM curated.earthquakes_curated WHERE time >= NOW() - INTERVAL '24 hours' ORDER BY mag DESC LIMIT 1) AS strongest_place_24h
            FROM curated.earthquakes_curated
            WHERE time >= NOW() - INTERVAL '24 hours';
        """)).mappings().first() or {}

        # 2. Top 5 regiones con mayor actividad en los últimos 7 días
        top_places = [
            dict(row) for row in db.execute(text("""
                SELECT place, COUNT(*) AS count, MAX(mag) AS max_mag, ROUND(AVG(mag)::numeric, 2) AS avg_mag
                FROM curated.earthquakes_curated
                WHERE time >= NOW() - INTERVAL '7 days' AND place IS NOT NULL
                GROUP BY place
                ORDER BY count DESC
                LIMIT 5;
            """)).mappings().all()
        ]

        # 3. Regiones con menor actividad / eventos aislados en 7 días
        lowest_places = [
            dict(row) for row in db.execute(text("""
                SELECT place, COUNT(*) AS count, MIN(mag) AS min_mag, MAX(mag) AS max_mag
                FROM curated.earthquakes_curated
                WHERE time >= NOW() - INTERVAL '7 days' AND place IS NOT NULL
                GROUP BY place
                ORDER BY count ASC, max_mag ASC
                LIMIT 5;
            """)).mappings().all()
        ]

        # 4. Anomalías estadísticas recientes
        anomalies = [
            dict(row) for row in db.execute(text("""
                SELECT region, cluster_size, radius_km, max_magnitude, explanation
                FROM curated.seismic_anomalies
                ORDER BY id DESC
                LIMIT 4;
            """)).mappings().all()
        ]

        # 5. Top 3 sismos más fuertes recientes
        strongest = [
            dict(row) for row in db.execute(text("""
                SELECT place, mag, depth_km, TO_CHAR(time, 'YYYY-MM-DD HH24:MI UTC') AS event_time
                FROM curated.earthquakes_curated
                ORDER BY mag DESC, time DESC
                LIMIT 3;
            """)).mappings().all()
        ]

        return {
            "kpis": dict(kpi_res),
            "top_places": top_places,
            "lowest_places": lowest_places,
            "anomalies": anomalies,
            "strongest_events": strongest,
        }
    except Exception as e:
        logger.warning("No fue posible extraer contexto completo en vivo: %s", str(e))
        return {
            "kpis": {"total_24h": 0, "max_mag_24h": 0.0, "avg_mag_24h": 0.0, "tsunami_alerts_24h": 0, "strongest_place_24h": "N/A"},
            "top_places": [],
            "lowest_places": [],
            "anomalies": [],
            "strongest_events": [],
        }


class SismoAiAgent:
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
        self.groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()

    def process_query(
        self,
        user_text: str,
        db: Session,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """Procesa una consulta conversacional, analítica o Text-to-SQL de extremo a extremo."""
        start_time = time.time()
        clean_text = sanitize_message(user_text)
        lower_text = clean_text.lower()

        # 1. Blindaje Estricto de Dominio (Filtro OWASP de alcance)
        if is_out_of_domain(clean_text):
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "sender": "bot",
                "status": "domain_restricted",
                "reply": REJECTION_MESSAGE,
                "data": [],
                "columns": [],
                "row_count": 0,
                "executed_sql": None,
                "provider_used": "Guardrail de Dominio SismoWatch",
                "latency_ms": latency_ms,
                "suggested_questions": DEFAULT_SUGGESTIONS,
            }

        # 2. Detección de saludos
        if self._is_greeting(lower_text):
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "sender": "bot",
                "status": "success",
                "reply": (
                    "¡Hola! Soy **SismoBot**, el copiloto analítico inteligente de **SismoWatch**.\n\n"
                    "Analizo en tiempo real la capa Gold curada de sismología global y monitoreo alertas geofísicas.\n\n"
                    "**Puedes consultarme:**\n"
                    "- *¿Dónde hay más sismos actualmente?*\n"
                    "- *¿Cuál es el lugar con menor actividad registrada?*\n"
                    "- *Genérame un reporte ejecutivo de las últimas 24h*\n"
                    "- *¿Cuáles son las anomalías estadísticas o enjambres detectados?*\n"
                    "- *O escribe directamente una consulta SQL o pregunta técnica específica.*"
                ),
                "data": [],
                "columns": [],
                "row_count": 0,
                "executed_sql": None,
                "provider_used": "Asistente Operativo SismoWatch",
                "latency_ms": latency_ms,
                "suggested_questions": DEFAULT_SUGGESTIONS,
            }

        # 3. Detección de preguntas de arquitectura / linaje / catálogo
        if self._is_architecture_query(lower_text):
            latency_ms = int((time.time() - start_time) * 1000)
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
                "provider_used": "Gobernanza Medallion",
                "latency_ms": latency_ms,
                "suggested_questions": DEFAULT_SUGGESTIONS,
            }

        # 4. Extraer hechos en tiempo real para consultas conversacionales o reportes
        facts = get_live_seismic_facts(db)

        # 5. Rama Conversacional / Reporte Ejecutivo / Zonas Activas vs Calmas
        if self._is_conversational_or_report(lower_text) and not lower_text.startswith("select "):
            analysis_text, provider_name = self._generate_conversational_analysis(clean_text, facts, history)
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "sender": "bot",
                "status": "success",
                "reply": analysis_text,
                "question": clean_text,
                "data": [],
                "columns": [],
                "row_count": 0,
                "executed_sql": None,
                "provider_used": provider_name,
                "latency_ms": latency_ms,
                "suggested_questions": self._build_contextual_suggestions(clean_text),
                "context_used": {
                    "total_24h": facts.get("kpis", {}).get("total_24h"),
                    "max_mag_24h": facts.get("kpis", {}).get("max_mag_24h"),
                    "top_place": facts.get("top_places", [{}])[0].get("place") if facts.get("top_places") else None,
                },
            }

        # 6. Rama Text-to-SQL + AST Guard + Tabular Results
        provider_used = "Motor Determinístico AST"
        sql_candidate = None

        if lower_text.startswith("select "):
            sql_candidate = clean_text
            provider_used = "SQL Directo"
        else:
            llm_sql, llm_prov = self._generate_sql_with_llm(clean_text)
            if llm_sql:
                sql_candidate = llm_sql
                provider_used = llm_prov
            else:
                sql_candidate = self._deterministic_text_to_sql(lower_text)
                provider_used = "Traductor Semántico"

        # Validación estricta por AST (sql_guard)
        try:
            safe_sql = validate_read_only_sql(sql_candidate, max_limit=100)
        except SQLSecurityError as sec_err:
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "sender": "bot",
                "status": "security_block",
                "reply": f"⚠️ **Política de Seguridad Bloqueante**: La consulta fue rechazada por el motor AST: {str(sec_err)}",
                "data": [],
                "columns": [],
                "row_count": 0,
                "executed_sql": sql_candidate,
                "provider_used": "AST Security Guard",
                "latency_ms": latency_ms,
                "suggested_questions": DEFAULT_SUGGESTIONS,
            }

        # Ejecución segura en base de datos (Transacción Read Only)
        try:
            db.execute(text("SET TRANSACTION READ ONLY;"))
            result = db.execute(text(safe_sql))
            columns = list(result.keys())
            rows = [dict(zip(columns, row)) for row in result.fetchall()]
        except Exception as db_err:
            logger.error("Error al ejecutar consulta SQL en BD: %s", str(db_err))
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "sender": "bot",
                "status": "error",
                "reply": f"❌ **Error al consultar la base de datos**: {str(db_err)}",
                "data": [],
                "columns": [],
                "row_count": 0,
                "executed_sql": safe_sql,
                "provider_used": provider_used,
                "latency_ms": latency_ms,
                "suggested_questions": DEFAULT_SUGGESTIONS,
            }

        # Generación de síntesis narrativa inteligente
        narrative_reply = self._generate_narrative(clean_text, safe_sql, rows, provider_used)
        latency_ms = int((time.time() - start_time) * 1000)

        return {
            "sender": "bot",
            "status": "success",
            "reply": narrative_reply,
            "question": clean_text,
            "executed_sql": safe_sql,
            "row_count": len(rows),
            "columns": columns,
            "data": rows,
            "provider_used": provider_used,
            "latency_ms": latency_ms,
            "suggested_questions": self._build_contextual_suggestions(clean_text),
        }

    def _is_greeting(self, text_str: str) -> bool:
        greetings = ["hola", "buenas", "buenos dias", "buenas tardes", "hello", "hi", "que puedes hacer", "ayuda", "help", "quien eres"]
        return any(text_str == g or text_str.startswith(g + " ") for g in greetings)

    def _is_architecture_query(self, text_str: str) -> bool:
        keywords = ["esquema", "tablas", "medallion", "linaje", "lineage", "catalogo", "arquitectura", "capas"]
        return any(k in text_str for k in keywords) and not any(k in text_str for k in ["sismo", "mag", "terremoto", "tsunami", "fuerte"])

    def _is_conversational_or_report(self, t: str) -> bool:
        """Determina si la consulta debe responderse con análisis estructurado en lugar de SQL tabular."""
        report_triggers = [
            "reporte", "resumen", "informe", "consolidado", "balance", "sintesis", "síntesis",
            "donde hay mas", "dónde hay más", "mayor actividad", "mas sismos", "más sismos", "zonas calientes",
            "menor actividad", "menos sismos", "calma", "aislado", "tranquil",
            "anomalia", "anomalía", "atipic", "z-score", "enjambre",
            "panorama", "situacion actual", "situación actual", "que ha pasado", "qué ha pasado", "tendencias"
        ]
        return any(trig in t for trig in report_triggers)

    def _build_contextual_suggestions(self, query: str) -> List[str]:
        lower = query.lower()
        if "reporte" in lower or "resumen" in lower:
            return [
                "¿Dónde hay más sismos actualmente?",
                "¿Qué anomalías estadísticas se detectaron?",
                "Top 5 sismos más fuertes de la semana",
            ]
        if "más" in lower or "mayor" in lower:
            return [
                "¿Cuál es el lugar con menor actividad?",
                "Genérame un reporte ejecutivo de las últimas 24h",
                "¿Hay alertas de tsunami activas?",
            ]
        return DEFAULT_SUGGESTIONS

    def _generate_conversational_analysis(
        self,
        question: str,
        ctx: Dict[str, Any],
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Tuple[str, str]:
        """Genera análisis sismológico respaldado por hechos en vivo usando Groq, Gemini o Plan B."""
        k = ctx.get("kpis", {})
        top_str = "\n".join(
            [f"  - {row['place']}: {row['count']} sismos (Magnitud máx: {row['max_mag']})" for row in ctx.get("top_places", [])]
        ) or "  - No hay datos suficientes"

        low_str = "\n".join(
            [f"  - {row['place']}: {row['count']} sismo aislado (Magnitud: {row['min_mag']})" for row in ctx.get("lowest_places", [])]
        ) or "  - No hay datos suficientes"

        strongest_str = "\n".join(
            [f"  - {row['place']}: Magnitud {row['mag']}, Profundidad: {row['depth_km']} km ({row['event_time']})" for row in ctx.get("strongest_events", [])]
        ) or "  - No hay sismos destacados"

        anom_str = "\n".join(
            [f"  - {row.get('region', 'Zona')}: Clúster de {row.get('cluster_size', 0)} eventos, Mag {row.get('max_magnitude', 0.0)} ({row.get('explanation', '')})" for row in ctx.get("anomalies", [])]
        ) or "  - No se registran anomalías estadísticas recientes"

        system_prompt = f"""Eres 'SismoBot', el copiloto sismológico especializado y analista oficial de SismoWatch.
Tu labor es responder consultas de usuarios analizando con rigor científico y precisión la base de datos oficial del USGS (capa Curated/Gold de PostgreSQL).

REGLA DE ORO DE DOMINIO Y BLINDAJE ESTRICTO (INQUEBRANTABLE):
1. Tu ámbito de actuación está EXCLUSIVA Y ESTRICTAMENTE LIMITADO a:
   - Sismología, actividad tectónica, fallas geológicas y eventos sísmicos.
   - Análisis de los datos, magnitudes, profundidades, series de tiempo y anomalías de la plataforma SismoWatch.
   - Alertas de tsunami y protocolos de prevención ante sismos.
2. Si el usuario te pregunta sobre CUALQUIER TEMA AJENO (cocina, política, deportes, criptomonedas, código general, tareas escolares):
   DEBES RECHAZAR LA CONSULTA FIRME Y CORTÉSMENTE, respondiendo:
   "Como asistente especializado de SismoWatch, mi labor se limita exclusivamente al análisis de actividad sísmica, eventos tectónicos y monitoreo geológico en la capa Curated. No estoy autorizado para responder sobre otros temas."

DATOS EN TIEMPO REAL VERIFICADOS (CAPA CURATED):
* Total de sismos en las últimas 24 horas: {k.get('total_24h', 0)}
* Magnitud máxima en 24h: {k.get('max_mag_24h', 0.0)} ({k.get('strongest_place_24h', 'N/A')})
* Promedio de magnitud en 24h: {k.get('avg_mag_24h', 0.0)} Mw
* Alertas de Tsunami activas (24h): {k.get('tsunami_alerts_24h', 0)}

ZONAS CON MAYOR ACTIVIDAD SÍSMICA (Últimos 7 días):
{top_str}

ZONAS CON MENOR ACTIVIDAD SÍSMICA / EVENTOS AISLADOS (Últimos 7 días):
{low_str}

SISMOS MÁS FUERTES REGISTRADOS:
{strongest_str}

ANOMALÍAS ESTADÍSTICAS Y ENJAMBRES DETECTADOS:
{anom_str}

INSTRUCCIONES CLAVE DE RESPUESTA:
1. Responde SIEMPRE en Español, con tono profesional, analítico y estructurado con Markdown (usa viñetas, negritas, encabezados y tablas cuando aplique). Desarrolla tus ideas de forma completa y precisa.
2. Si preguntan '¿dónde hay más sismos?', lista con exactitud las zonas con mayor actividad y explica brevemente la concentración sísmica.
3. Si preguntan '¿cuál es el lugar de menor actividad?', cita los lugares con menor número de registros aislados en el monitoreo.
4. Si piden 'generar un reporte', estructura la respuesta en:
   - Resumen Ejecutivo
   - Zonas Calientes vs. Zonas Calmas
   - Eventos Relevantes y Alertas
   - Conclusiones y Monitoreo Preventivo
5. NUNCA inventes números fuera de los datos reales provistos.
"""

        # Construir mensajes con historial
        messages = [{"role": "system", "content": system_prompt}]
        for h in (history or [])[-4:]:
            role = "assistant" if h.get("role") in ["assistant", "bot"] else "user"
            messages.append({"role": role, "content": sanitize_message(h.get("content", ""))})
        messages.append({"role": "user", "content": question})

        # Intento 1: Groq Cloud
        if self.groq_api_key:
            try:
                resp = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.groq_api_key}", "Content-Type": "application/json"},
                    json={
                        "model": self.groq_model,
                        "messages": messages,
                        "temperature": 0.2,
                        "max_tokens": 2000,
                    },
                    timeout=12,
                )
                if resp.status_code == 200:
                    reply = resp.json()["choices"][0]["message"]["content"].strip()
                    return reply, f"Groq LLaMA ({self.groq_model})"
            except Exception as e:
                logger.warning("Fallo en inferencia conversacional con Groq: %s", str(e))

        # Intento 2: Google Gemini
        if self.gemini_api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_api_key}"
                combined_prompt = f"{system_prompt}\n\nPregunta del usuario: {question}"
                resp = requests.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={"contents": [{"parts": [{"text": combined_prompt}]}]},
                    timeout=12,
                )
                if resp.status_code == 200:
                    reply = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                    return reply, f"Google Gemini ({self.gemini_model})"
            except Exception as e:
                logger.warning("Fallo en inferencia conversacional con Gemini: %s", str(e))

        # Intento 3: Fallback Determinístico (Plan B)
        return self._plan_b_seismic_response(question.lower(), ctx), "Motor Determinístico Plan B"

    def _plan_b_seismic_response(self, lower: str, ctx: Dict[str, Any]) -> str:
        """Generador determinístico de alta fidelidad cuando los LLMs externos no responden."""
        k = ctx.get("kpis", {})
        top = ctx.get("top_places", [])
        low = ctx.get("lowest_places", [])
        anom = ctx.get("anomalies", [])

        if "reporte" in lower or "resumen" in lower or "informe" in lower:
            top_lines = "\n".join([f"- **{r['place']}**: {r['count']} sismos (Máx: {r['max_mag']} Mw)" for r in top[:3]]) or "- Sin registros significativos."
            return f"""### 📊 Reporte Sísmico Ejecutivo (Plan B Certificado)

* **Actividad Global 24h:** Se han consolidado **{k.get('total_24h', 0)} eventos sísmicos** certificados en la capa Curated.
* **Sismo Más Significativo:** Magnitud **{k.get('max_mag_24h', 0.0)} Mw** en *{k.get('strongest_place_24h', 'Región monitoreada')}*.
* **Magnitud Promedio:** **{k.get('avg_mag_24h', 0.0)} Mw**.
* **Alertas Oceánicas:** **{k.get('tsunami_alerts_24h', 0)} alertas de tsunami** registradas.

#### 📍 Zonas con Mayor Frecuencia (7 días):
{top_lines}

*Nota: Reporte generado en modo de contingencia directa sobre hechos verificados de PostgreSQL.*"""

        if any(w in lower for w in ["más", "mas", "mayor", "frecuente"]):
            top_lines = "\n".join([f"1. **{r['place']}**: **{r['count']} sismos** (Magnitud máxima: {r['max_mag']} Mw, Promedio: {r['avg_mag']} Mw)" for r in top]) or "No se identificaron zonas con concentración atípica."
            return f"""### 📍 Zonas con Mayor Actividad Sísmica Reciente

Según el registro de los últimos 7 días en la capa Curated de SismoWatch, las zonas de mayor concentración sísmica son:

{top_lines}

Estas regiones representan los epicentros de mayor recurrencia tectónica actualmente monitoreados."""

        if any(w in lower for w in ["menor", "menos", "calma", "aislado", "tranquil"]):
            low_lines = "\n".join([f"- **{r['place']}**: solo **{r['count']} sismo aislado** (Magnitud: {r['min_mag']} Mw)" for r in low]) or "No se identificaron zonas de baja actividad."
            return f"""### 📉 Zonas con Menor Actividad Sísmica Registrada

En el monitoreo de los últimos 7 días, las siguientes zonas reportan el menor número de eventos registrados (sismos aislados):

{low_lines}

Estas ubicaciones presentan actualmente un estado de relativa calma o baja densidad sísmica dentro del catálogo."""

        if any(w in lower for w in ["anomal", "atipic", "enjambre"]):
            anom_lines = "\n".join([f"- **{r.get('region', 'Zona')}**: Clúster de {r.get('cluster_size', 0)} eventos, Mag pico: {r.get('max_magnitude', 0.0)} Mw — *{r.get('explanation', '')}*" for r in anom]) if anom else "No se registran anomalías estadísticas activas en las últimas horas."
            return f"""### 🔍 Anomalías Estadísticas y Enjambres Detectados

{anom_lines}

Estos eventos representan desviaciones significativas respecto a la línea base histórica regional."""

        return f"""### 🌍 Estado Sísmico Global en Tiempo Real

* **Total sismos 24h:** **{k.get('total_24h', 0)}** eventos validados.
* **Sismo Mayor:** **{k.get('max_mag_24h', 0.0)} Mw** ({k.get('strongest_place_24h', 'N/A')}).
* **Zona Más Activa:** **{top[0]['place'] if top else 'N/A'}** ({top[0]['count'] if top else 0} sismos).
* **Zona de Menor Registro:** **{low[0]['place'] if low else 'N/A'}** (1 sismo).

*Puedes consultarme: "¿Dónde hay más sismos?", "¿Cuál es el lugar con menor actividad?" o "Genérame un reporte ejecutivo".*"""

    def _generate_sql_with_llm(self, question: str) -> Tuple[Optional[str], Optional[str]]:
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

        return "SELECT id, mag, place, time, depth_km, alert FROM curated.earthquakes_curated ORDER BY time DESC LIMIT 15"

    def _generate_narrative(self, question: str, sql: str, rows: List[Dict[str, Any]], provider_used: str) -> str:
        """Genera una respuesta explicativa en español utilizando el LLM o un sintetizador estructurado."""
        if not rows:
            return "Se ejecutó la consulta en la capa **curated**, pero no se encontraron registros que coincidan con los criterios."

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
