-- ==============================================================================
-- 04-tables-curated.sql - Capa Gold (Datos validados, auditoría y consumo)
-- ==============================================================================

-- 1. Eventos sísmicos curados (validados y listos para consumo)
CREATE TABLE IF NOT EXISTS curated.earthquakes_curated (
    id VARCHAR(64) PRIMARY KEY,
    mag NUMERIC(5, 2) NOT NULL,
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
    is_validated BOOLEAN NOT NULL DEFAULT TRUE,
    batch_id VARCHAR(64) NOT NULL,
    curated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_curated_time ON curated.earthquakes_curated(time DESC);
CREATE INDEX IF NOT EXISTS idx_curated_mag ON curated.earthquakes_curated(mag);
CREATE INDEX IF NOT EXISTS idx_curated_coords ON curated.earthquakes_curated(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_curated_place ON curated.earthquakes_curated(place);

-- 2. Registros rechazados por calidad (Cuarentena)
CREATE TABLE IF NOT EXISTS curated.quality_quarantine (
    quarantine_id SERIAL PRIMARY KEY,
    event_id VARCHAR(64),
    raw_payload JSONB,
    rejection_reason TEXT NOT NULL,
    rule_failed VARCHAR(100) NOT NULL,
    batch_id VARCHAR(64),
    failed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quarantine_failed_at ON curated.quality_quarantine(failed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quarantine_rule ON curated.quality_quarantine(rule_failed);

-- 3. Métricas y resultados de calidad
CREATE TABLE IF NOT EXISTS curated.quality_results (
    id SERIAL PRIMARY KEY,
    dag_run_id VARCHAR(120) NOT NULL,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_records INT NOT NULL DEFAULT 0,
    records_passed INT NOT NULL DEFAULT 0,
    records_rejected INT NOT NULL DEFAULT 0,
    quality_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    rules_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    freshness_lag_seconds INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quality_evaluated_at ON curated.quality_results(evaluated_at DESC);

-- 4. Registro de auditoría de ejecuciones de IA (ai_runs)
CREATE TABLE IF NOT EXISTS curated.ai_runs (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(120) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    latency_ms INT NOT NULL,
    cost_estimate_usd NUMERIC(8, 6) DEFAULT 0.0,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_runs_executed_at ON curated.ai_runs(executed_at DESC);

-- 5. Reportes ejecutivos diarios generados con IA
CREATE TABLE IF NOT EXISTS curated.ai_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary_narrative TEXT NOT NULL,
    top_regions JSONB NOT NULL DEFAULT '[]'::jsonb,
    max_magnitude_event JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_events_24h INT NOT NULL DEFAULT 0,
    avg_magnitude NUMERIC(4, 2) NOT NULL DEFAULT 0.0,
    tsunami_alerts_count INT NOT NULL DEFAULT 0,
    anomalies_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
    provider_used VARCHAR(50) NOT NULL,
    validation_passed BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_reports_date ON curated.ai_reports(report_date DESC);

-- 6. Estado y observabilidad de DAGs (pipeline_runs)
CREATE TABLE IF NOT EXISTS curated.pipeline_runs (
    id SERIAL PRIMARY KEY,
    dag_id VARCHAR(100) NOT NULL,
    run_id VARCHAR(150) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds NUMERIC(8, 2),
    records_ingested INT DEFAULT 0,
    records_curated INT DEFAULT 0,
    records_quarantined INT DEFAULT 0,
    error_details TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_updated ON curated.pipeline_runs(updated_at DESC);

-- 7. Tabla de usuarios para la plataforma (RBAC: viewer / admin)
CREATE TABLE IF NOT EXISTS curated.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON curated.users(username);
