-- ==============================================================================
-- 03-tables-staging.sql - Capa Silver (Datos aplanados, limpios y tipados)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS staging.earthquakes_staging (
    id VARCHAR(64) PRIMARY KEY,
    mag NUMERIC(5, 2),
    place TEXT,
    time TIMESTAMPTZ NOT NULL,
    updated TIMESTAMPTZ,
    tz INT,
    url TEXT,
    detail TEXT,
    felt INT,
    cdi NUMERIC(4, 1),
    mmi NUMERIC(4, 1),
    alert VARCHAR(20),
    status VARCHAR(50),
    tsunami INT DEFAULT 0,
    sig INT,
    net VARCHAR(20),
    code VARCHAR(50),
    ids TEXT,
    sources TEXT,
    types TEXT,
    nst INT,
    dmin NUMERIC(8, 4),
    rms NUMERIC(8, 4),
    gap NUMERIC(8, 4),
    mag_type VARCHAR(20),
    type VARCHAR(50),
    title TEXT,
    longitude DOUBLE PRECISION NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    depth_km DOUBLE PRECISION NOT NULL,
    batch_id VARCHAR(64) NOT NULL,
    transformed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staging_time ON staging.earthquakes_staging(time DESC);
CREATE INDEX IF NOT EXISTS idx_staging_mag ON staging.earthquakes_staging(mag);
