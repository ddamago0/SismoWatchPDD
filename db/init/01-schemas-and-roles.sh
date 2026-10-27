#!/usr/bin/env bash
# ==============================================================================
# 01-schemas-and-roles.sh - Inicialización de Esquemas Medallion y Roles RBAC
# ==============================================================================
set -euo pipefail

echo "🐘 [PostgreSQL Init] Creando esquemas Medallion y roles de mínimo privilegio..."

: "${INGEST_USER:?INGEST_USER es requerido}"
: "${INGEST_PASSWORD:?INGEST_PASSWORD es requerido}"
: "${TRANSFORM_USER:?TRANSFORM_USER es requerido}"
: "${TRANSFORM_PASSWORD:?TRANSFORM_PASSWORD es requerido}"
: "${READ_USER:?READ_USER es requerido}"
: "${READ_PASSWORD:?READ_PASSWORD es requerido}"

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
-- 1. Crear esquemas de la arquitectura Medallion
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS curated;

-- 2. Rol Ingesta: solo interactúa con schema raw
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${INGEST_USER}') THEN
    CREATE ROLE ${INGEST_USER} WITH LOGIN PASSWORD '${INGEST_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  ELSE
    ALTER ROLE ${INGEST_USER} WITH PASSWORD '${INGEST_PASSWORD}';
  END IF;
END
\$\$;

-- 3. Rol Transformación: lee raw, escribe/lee staging, escribe/lee curated
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${TRANSFORM_USER}') THEN
    CREATE ROLE ${TRANSFORM_USER} WITH LOGIN PASSWORD '${TRANSFORM_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  ELSE
    ALTER ROLE ${TRANSFORM_USER} WITH PASSWORD '${TRANSFORM_PASSWORD}';
  END IF;
END
\$\$;

-- 4. Rol Lectura (API de la plataforma): SOLO lectura en schema curated
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${READ_USER}') THEN
    CREATE ROLE ${READ_USER} WITH LOGIN PASSWORD '${READ_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  ELSE
    ALTER ROLE ${READ_USER} WITH PASSWORD '${READ_PASSWORD}';
  END IF;
END
\$\$;

SQL

echo "✅ [PostgreSQL Init] Esquemas y roles creados correctamente."
