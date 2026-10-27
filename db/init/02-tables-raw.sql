-- ==============================================================================
-- 02-tables-raw.sql - Capa Bronze (Carga cruda e inmutable de USGS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS raw.usgs_earthquakes_raw (
    id VARCHAR(64) PRIMARY KEY,
    properties JSONB NOT NULL,
    geometry JSONB NOT NULL,
    source_feed VARCHAR(255) NOT NULL,
    batch_id VARCHAR(64) NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_raw_ingested_at ON raw.usgs_earthquakes_raw(ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_batch_id ON raw.usgs_earthquakes_raw(batch_id);
