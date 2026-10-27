# Resumen de Requisitos y Criterios de Evaluación — SismoWatch PDD

Este documento sintetiza la fuente de verdad del archivo `Enunciado Prueba de Desempeño - Ruta IA y Automatización.pdf` para consulta directa en el repositorio.

---

## 1. Contexto General del Negocio
- **Empresa**: SuperApp (superaplicación de servicios: movilidad, entregas, pagos y servicios cotidianos).
- **Problema**: Mitigar el impacto operativo de eventos sísmicos en tiempo real sobre conductores, repartidores, usuarios y centros de distribución.
- **Solución (SismoWatch)**: Pipeline automatizado de datos sísmicos con arquitectura Medallion, validación estricta de calidad, generación de reportes ejecutivos con IA generativa multimodelo resiliente, API REST segura con RBAC y streaming en tiempo real (SSE), y un dashboard analítico para la toma de decisiones.

---

## 2. Pila Tecnológica Obligatoria
1. **Base de Datos**: PostgreSQL 16 con schemas Medallion (`raw`, `staging`, `curated`) y control de acceso RBAC por roles de mínimo privilegio (`sismo_ingest`, `sismo_transform`, `sismo_reader`).
2. **Orquestación**: Apache Airflow 2.8.1 (LocalExecutor, Python 3.11).
3. **Calidad de Datos**: Pandera (validación de esquemas tipados) + Cuarentena con trazabilidad de descarte.
4. **Backend API**: FastAPI (Python 3.11), JWT, RBAC (`admin`, `viewer`), Server-Sent Events (SSE) `/api/stream`, conexión exclusiva a `curated`.
5. **Frontend**: React + TypeScript + Vite, Leaflet (mapa sísmico), Recharts (visualizaciones analíticas).
6. **Inteligencia Artificial**: LLM en cascada multimodelo:
   - Proveedor Primario: Google Gemini (`gemini-3.8-flash` via `google-genai`).
   - Proveedor Secundario (Fallback): Groq (`openai/gpt-oss-120b`).
   - Fallback de Última Instancia: Plantilla determinista estructurada.
   - Guardián Anti-Alucinación: Validador numérico por Regex.
   - Bono Opcional: Asistente analítico Text-to-SQL con salvaguarda AST (`sqlparse`).
7. **Despliegue**: Docker Compose único (`docker compose up -d`).

---

## 3. Arquitectura Medallion y Seguridad RBAC
| Capa | Schema | Responsabilidad | Rol Autorizado |
| :--- | :--- | :--- | :--- |
| **Bronze** | `raw` | Ingesta cruda JSONB de USGS con metadata de auditoría (`ingestion_timestamp`, `source_feed`). | `sismo_ingest` (INSERT, SELECT) |
| **Silver** | `staging` | Desanidación, tipado estricto, estandarización de coordenadas y marcas de tiempo UTC. | `sismo_transform` (ALL) |
| **Gold** | `curated` | Datos limpios listos para consumo (`earthquakes_curated`), cuarentena (`quality_quarantine`), resultados de calidad (`quality_results`), ejecuciones de IA (`ai_runs`), reportes (`ai_reports`), estado de pipelines (`pipeline_runs`) y usuarios (`users`). | `sismo_transform` (WRITE), `sismo_reader` (SELECT ONLY) |

> **Regla de Oro de Seguridad**: El backend FastAPI utiliza exclusivamente el rol `sismo_reader`, el cual tiene denegado el acceso a `raw`, `staging` y a cualquier sentencia de escritura en la base de datos.

---

## 4. Criterios de Aceptación Clave
1. **Idempotencia**: Las re-ejecuciones de los DAGs con los mismos datos no deben generar duplicados (`ON CONFLICT (id) DO UPDATE`).
2. **Cuarentena de Calidad**: Si un registro viola las reglas (ej. latitud > 90 o profundidad negativa inválida), es desviado a `curated.quality_quarantine` y nunca llega a `curated.earthquakes_curated`.
3. **Resiliencia de IA**: Si Gemini o Groq fallan o están sobrecargados (503), el pipeline NO se cae; activa automáticamente el siguiente escalón de la cascada.
4. **Validación Anti-Alucinación**: Ningún reporte se guarda si las métricas numéricas del texto difieren de las calculadas de forma determinista en SQL/Python.
5. **Seguridad RBAC en API**:
   - `viewer`: solo lectura de eventos, KPIs, estadísticas y estado básico del pipeline. Recibe `403 Forbidden` al intentar ver cuarentena o disparar backfills.
   - `admin`: acceso a cuarentena, re-ejecución de pipelines y backfill histórico.
