"""
Pruebas de Idempotencia en la Capa Medallion de PostgreSQL.
Garantiza que la re-ejecución repetida de DAGs con los mismos IDs
no duplica registros gracias a la cláusula 'ON CONFLICT (id) DO UPDATE'.
"""

import os
import sys
from pathlib import Path
import psycopg2
import pytest

repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root / "api"))
from src.config import settings

DB_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "postgres" if os.path.exists("/.dockerenv") else "127.0.0.1"),
    "port": int(os.getenv("POSTGRES_PORT", str(settings.POSTGRES_PORT))),
    "dbname": settings.POSTGRES_DB,
    "user": settings.POSTGRES_USER,
    "password": settings.POSTGRES_PASSWORD,
}


@pytest.fixture
def db_conn():
    conn = psycopg2.connect(**DB_CONFIG)
    yield conn
    # Teardown: Limpiar registros de prueba
    cur = conn.cursor()
    cur.execute("DELETE FROM curated.earthquakes_curated WHERE id LIKE 'test_idempotency_%';")
    conn.commit()
    conn.close()


def test_idempotent_insert_no_duplicates(db_conn):
    """
    Verifica que insertar dos veces el mismo sismo no duplica el registro
    y actualiza sus atributos correctamente.
    """
    cur = db_conn.cursor()
    test_id = "test_idempotency_earthquake_999"

    insert_sql = """
        INSERT INTO curated.earthquakes_curated (
            id, mag, place, time, updated, url, detail, status, tsunami, sig,
            net, code, sources, mag_type, type, title, longitude, latitude,
            depth_km, batch_id, is_validated
        ) VALUES (
            %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s
        )
        ON CONFLICT (id) DO UPDATE SET
            mag = EXCLUDED.mag,
            updated = EXCLUDED.updated,
            batch_id = EXCLUDED.batch_id;
    """

    # 1. Primera ejecución (Inserción inicial)
    cur.execute(
        insert_sql,
        (
            test_id, 4.5, "Región de Prueba Idempotencia", "https://usgs.gov", "detail",
            "reviewed", 0, 100, "us", test_id, "us", "mw", "earthquake",
            "M 4.5 Idempotency Test", -74.0, 4.0, 10.0, "batch_001", True
        )
    )
    db_conn.commit()

    # Comprobar que existe exactamente 1 registro con magnitud 4.5
    cur.execute("SELECT COUNT(*), MAX(mag) FROM curated.earthquakes_curated WHERE id = %s;", (test_id,))
    count, mag = cur.fetchone()
    assert count == 1
    assert float(mag) == 4.5

    # 2. Segunda ejecución idéntica o con actualización (Re-ejecución del pipeline)
    cur.execute(
        insert_sql,
        (
            test_id, 4.9, "Región de Prueba Idempotencia", "https://usgs.gov", "detail",
            "reviewed", 0, 100, "us", test_id, "us", "mw", "earthquake",
            "M 4.9 Idempotency Test", -74.0, 4.0, 10.0, "batch_002", True
        )
    )
    db_conn.commit()

    # Comprobar que SIGUE habiendo exactamente 1 registro (CERO duplicados) y la magnitud se actualizó a 4.9
    cur.execute("SELECT COUNT(*), MAX(mag), MAX(batch_id) FROM curated.earthquakes_curated WHERE id = %s;", (test_id,))
    count, mag, batch = cur.fetchone()
    assert count == 1, "Violación de idempotencia: Se generó un registro duplicado."
    assert float(mag) == 4.9
    assert batch == "batch_002"
