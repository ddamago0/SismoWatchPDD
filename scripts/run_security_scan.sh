#!/usr/bin/env bash
# ==============================================================================
# SismoWatch PDD - Script Automatizado de Auditoría y Seguridad
# ==============================================================================
# Ejecuta escaneos estáticos de vulnerabilidades, dependencias y secretos:
#   1. Bandit: Análisis estático de código Python (AST SAST) en api/ y airflow/include/
#   2. Pip-audit: Auditoría de vulnerabilidades conocidas (CVEs) en dependencias PyPI
#   3. Gitleaks: Detección de credenciales y secretos expuestos en el código
# Guarda evidencias en docs/security/
# ==============================================================================
set -uo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

mkdir -p docs/security

echo "🛡️  Iniciando Auditoría de Seguridad SismoWatch PDD..."

# 1. Bandit SAST scan
echo "🔍 1/3 Ejecutando Bandit SAST en api/ y airflow/include/..."
if [ -x "./.venv/bin/bandit" ]; then
    ./.venv/bin/bandit -r api/src/ airflow/include/ -f custom --msg-template "{abspath}:{line}: {severity}[{test_id}]: {msg}" > docs/security/bandit_report.txt 2>&1 || true
    ./.venv/bin/bandit -r api/src/ airflow/include/ >> docs/security/bandit_report.txt 2>&1 || true
else
    echo "Bandit no encontrado en .venv" > docs/security/bandit_report.txt
fi
echo "   ✅ Bandit completado -> docs/security/bandit_report.txt"

# 2. Pip-audit scan
echo "📦 2/3 Ejecutando Pip-audit en dependencias..."
if [ -x "./.venv/bin/pip-audit" ]; then
    ./.venv/bin/pip-audit -r api/requirements.txt > docs/security/pip_audit_report.txt 2>&1 || true
    echo -e "\n--- Airflow Dependencies Audit ---" >> docs/security/pip_audit_report.txt
    ./.venv/bin/pip-audit -r airflow/requirements.txt >> docs/security/pip_audit_report.txt 2>&1 || true
else
    echo "pip-audit no encontrado en .venv" > docs/security/pip_audit_report.txt
fi
echo "   ✅ Pip-audit completado -> docs/security/pip_audit_report.txt"

# 3. Gitleaks secret scan
echo "🔑 3/3 Ejecutando Gitleaks para detección de secretos..."
GITLEAKS_BIN="/tmp/gitleaks"
if [ ! -x "$GITLEAKS_BIN" ]; then
    GITLEAKS_BIN="$(which gitleaks 2>/dev/null || true)"
fi

if [ -x "$GITLEAKS_BIN" ]; then
    "$GITLEAKS_BIN" detect --source . -v --redact > docs/security/gitleaks_report.txt 2>&1 || true
else
    echo "Gitleaks no disponible en el sistema." > docs/security/gitleaks_report.txt
fi
echo "   ✅ Gitleaks completado -> docs/security/gitleaks_report.txt"

echo "🎉 Auditoría de seguridad finalizada. Revisa docs/security/ para los reportes."

