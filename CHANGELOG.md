# Changelog - SismoWatch PDD

Todos los cambios notables de este proyecto están documentados aquí siguiendo las directrices de [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y [Conventional Commits](https://www.conventionalcommits.org/).

## [Fase 1] - 2026-10-27 - Infraestructura Base, Entorno Seguro y Capas Medallion en PostgreSQL

### Añadido
- **Seguridad y Secretos**: Configuración de `.gitignore` excluyendo `.env` y archivos sensibles. Plantilla `.env.example` completa sin secretos reales.
- **Generador de Entorno (`scripts/setup_env.sh`)**: Script automatizado que genera contraseñas criptográficas seguras (`secrets.token_urlsafe`), Fernet key de Airflow, claves JWT y asignación dinámica de puertos libres en el host con permisos restringidos `0600`.
- **Arquitectura Medallion en PostgreSQL (`db/init/`)**:
  - `01-schemas-and-roles.sh`: Inicialización de esquemas `raw`, `staging` y `curated`, y roles RBAC `sismo_ingest`, `sismo_transform` y `sismo_reader`.
  - `02-tables-raw.sql`: Capa Bronze (`raw.usgs_earthquakes_raw`) con payload crudo GeoJSON en formato `JSONB`, `source_feed`, `batch_id` y timestamp de ingesta.
  - `03-tables-staging.sql`: Capa Silver (`staging.earthquakes_staging`) con sismos aplanados, limpios y tipados (coordenadas separadas, timestamps normalizados en UTC).
  - `04-tables-curated.sql`: Capa Gold (`curated.earthquakes_curated`), tabla de aislamiento de calidad (`curated.quality_quarantine`), auditoría de métricas (`curated.quality_results`), telemetría de IA (`curated.ai_runs`), reportes ejecutivos (`curated.ai_reports`), observabilidad de DAGs (`curated.pipeline_runs`) y usuarios (`curated.users`).
  - `05-grant-permissions.sh`: Aplicación estricta de mínimo privilegio (ingest solo escribe raw; transform procesa entre capas; reader solo tiene SELECT en curated).
- **Orquestación Base**: `docker-compose.yml` con servicio PostgreSQL 16 y healthcheck.

### Verificado
- Ejecución limpia de scripts en `/docker-entrypoint-initdb.d/`.
- Comprobación de aislamiento de roles: `sismo_reader` puede consultar `curated` y recibe `permission denied` ante accesos a `raw` o intentos de escritura.

## [Fases 2 y 3] - 2026-10-27 - Ingesta USGS, Transformación Staging, Calidad Pandera, Cuarentena y Orquestación Airflow

### Añadido
- **Módulo de Ingesta (`airflow/include/usgs_client.py`)**: Cliente HTTP con reintentos exponenciales, timeouts estrictos y control de fallos ante indisponibilidad de USGS (`USGSUnavailableError`). Soporte para `all_hour.geojson` y consultas históricas FDSNWS.
- **Transformaciones (`airflow/include/transformations.py`)**: Aplanado de GeoJSON a esquema tabular (conversión de epoch ms a ISO 8601 UTC, extracción de coordenadas lon/lat/profundidad, sanitización de textos contra caracteres de control).
- **Motor de Calidad y Cuarentena (`airflow/include/quality.py`)**: Esquema declarativo Pandera (`DataFrameSchema`) con validaciones bloqueantes: obligatoriedad de id/time/coordenadas, rangos geográficos (latitud [-90, 90], longitud [-180, 180]), límites de magnitud ([-2.0, 10.5]), límites de profundidad ([-10, 1000] km), unicidad de ID y controles de frescura.
- **Acceso a Datos e Idempotencia (`airflow/include/db_utils.py`)**: Operaciones SQL idempotentes mediante `ON CONFLICT (id) DO UPDATE` para raw, staging y curated. Enrutamiento de anomalías a `curated.quality_quarantine` y métricas a `curated.quality_results`.
- **Detección de Anomalías (`airflow/include/anomaly_detection.py`)**: Algoritmo analítico Z-score sobre recuento y magnitudes regionales, y detección de sismos de alta energía (>= 6.0) o alerta de tsunami.
- **Cliente de IA Resiliente (`airflow/include/ai/client.py`)**: Cascada multi-proveedor de 3 niveles:
  1. Google Gemini (`gemini-3.8-flash`) como primario.
  2. Groq (`openai/gpt-oss-120b`) como failover inmediato ante saturación o error 503.
  3. Motor determinístico por plantilla (`airflow/include/ai/fallback_templates.py`) como contingencia garantizada.
  - Validador estricto numérico (`airflow/include/ai/validator.py`) que audita las cifras del LLM contra los cálculos reales y descarta el texto si detecta discrepancias o alucinaciones.
  - Telemetría persistida en `curated.ai_runs`.
- **DAGs de Airflow (`airflow/dags/`)**:
  - `dag_ingesta_usgs.py`: Ingesta continua cada 5 min con trigger a transformación y registro en `curated.pipeline_runs`.
  - `dag_transformacion_calidad.py`: Procesamiento raw -> staging -> calidad -> curated/quarantine.
  - `dag_backfill_historico.py`: Backfill parametrizado (hasta 30 días) vía FDSNWS.
  - `dag_reporte_ia_anomalias.py`: Generación diaria de resumen ejecutivo con IA y anomalías.

### Verificado
- Ejecución completa del flujo USGS -> Airflow -> Postgres (Bronze -> Silver -> Gold).
- Prueba de cuarentena: Inyección de registro con latitud corrupta (150.0) aislada exitosamente en `curated.quality_quarantine` sin llegar a `curated.earthquakes_curated` y reflejada con score 87.5% en `curated.quality_results`.
- Prueba de idempotencia: Re-ejecución del pipeline sobre el mismo intervalo no generó registros duplicados en `curated.earthquakes_curated`.
- Prueba de resiliencia IA: Ante 503 de Gemini, el sistema activó automáticamente Groq (`openai/gpt-oss-120b`), validó las cifras exactas y guardó el informe sin interrumpir el pipeline.
