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
