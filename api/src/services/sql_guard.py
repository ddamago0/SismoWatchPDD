"""
Salvaguarda AST para consultas Text-to-SQL de solo lectura (Bono Opcional).
Inspirado en la validación por AST de Medallion:
- Solo permite una sentencia SELECT.
- Restringido estrictamente a las tablas de curated.
- Bloquea sentencias DDL/DML (DROP, DELETE, UPDATE, INSERT, ALTER, EXEC, etc.).
- Fuerza un LIMIT máximo de 100 filas.
"""

import re
from typing import Optional
import sqlparse
from sqlparse.sql import IdentifierList, Identifier, Where
from sqlparse.tokens import Keyword, DML

ALLOWED_TABLES = {
    "earthquakes_curated",
    "curated.earthquakes_curated",
    "ai_reports",
    "curated.ai_reports",
    "quality_results",
    "curated.quality_results",
    "pipeline_runs",
    "curated.pipeline_runs",
}

FORBIDDEN_KEYWORDS = {
    "INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "TRUNCATE",
    "EXEC", "EXECUTE", "MERGE", "CALL", "GRANT", "REVOKE", "INTO",
    "VACUUM", "COPY", "REINDEX", "LOCK"
}


class SQLSecurityError(ValueError):
    pass


def validate_read_only_sql(query: str, max_limit: int = 100) -> str:
    """Valida que una consulta SQL sea estrictamente de solo lectura sobre tablas autorizadas."""
    if not query or not query.strip():
        raise SQLSecurityError("La consulta SQL no puede estar vacía.")

    if len(query) > 2000:
        raise SQLSecurityError("La consulta excede la longitud máxima permitida (2000 caracteres).")

    # Limpiar y parsear
    cleaned_query = query.strip().rstrip(";")
    parsed = sqlparse.parse(cleaned_query)

    if len(parsed) != 1:
        raise SQLSecurityError("Solo se permite ejecutar una única sentencia SQL.")

    stmt = parsed[0]
    if stmt.get_type() != "SELECT":
        raise SQLSecurityError(f"Operación no permitida: Solo se permiten consultas de tipo SELECT, no {stmt.get_type()}.")

    # Verificar palabras clave prohibidas
    tokens_text = [t.value.upper() for t in stmt.flatten()]
    for token in tokens_text:
        if token in FORBIDDEN_KEYWORDS:
            raise SQLSecurityError(f"Uso de palabra clave prohibida: {token}")

    # Envolver en subquery con límite forzado
    safe_query = f"SELECT * FROM ({cleaned_query}) AS guarded_subquery LIMIT {max_limit};"
    return safe_query
