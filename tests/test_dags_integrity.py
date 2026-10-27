"""
Pruebas de integridad estructural y sintaxis de los DAGs de Apache Airflow.
"""

import ast
from pathlib import Path
import pytest

repo_root = Path(__file__).resolve().parent.parent
dags_folder = repo_root / "airflow" / "dags"


def test_dags_syntax_integrity():
    """Valida que todos los DAGs se compilen sintácticamente sin errores."""
    dag_files = list(dags_folder.glob("*.py"))
    assert len(dag_files) >= 4, f"Se esperaban al menos 4 DAGs, encontrados: {len(dag_files)}"

    for dag_file in dag_files:
        content = dag_file.read_text(encoding="utf-8")
        try:
            tree = ast.parse(content, filename=str(dag_file))
            assert tree is not None
        except SyntaxError as e:
            pytest.fail(f"Error de sintaxis en el DAG {dag_file.name}: {e}")


def test_required_dags_present():
    """Verifica que los 4 DAGs requeridos por el enunciado del negocio existan."""
    expected_dags = [
        "dag_ingesta_usgs.py",
        "dag_transformacion_calidad.py",
        "dag_backfill_historico.py",
        "dag_reporte_ia_anomalias.py",
    ]
    for expected in expected_dags:
        dag_path = dags_folder / expected
        assert dag_path.exists(), f"El DAG requerido '{expected}' no existe en {dags_folder}"


def test_dags_contain_airflow_definitions():
    """Verifica que los archivos contengan instanciaciones de DAG y decoradores task."""
    for dag_file in dags_folder.glob("*.py"):
        content = dag_file.read_text(encoding="utf-8")
        assert "DAG(" in content or "@dag(" in content, f"{dag_file.name} no define un DAG de Airflow"
        assert "default_args" in content or "retries" in content

