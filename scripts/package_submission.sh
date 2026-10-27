#!/usr/bin/env bash
# ==============================================================================
# SismoWatch PDD - Script de Empaquetado para Entrega en Moodle
# ==============================================================================
# Genera un archivo ZIP limpio con todo el código fuente, configuración y docs,
# excluyendo artefactos pesados o efímeros (.git, node_modules, .venv, caches).
# ==============================================================================
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

OUTPUT_ZIP="SismoWatchPDD_Entrega.zip"

echo "📦 Generando paquete de entrega: $OUTPUT_ZIP..."

rm -f "$OUTPUT_ZIP"

zip -r "$OUTPUT_ZIP" . \
  -x "*.git*" \
  -x "*node_modules*" \
  -x "*.venv*" \
  -x "*__pycache__*" \
  -x "*.pytest_cache*" \
  -x "*.tsbuildinfo" \
  -x "*.DS_Store" \
  -x "tmp/*" \
  -x "*.zip"

echo "✅ Paquete generado exitosamente: $OUTPUT_ZIP ($(du -h "$OUTPUT_ZIP" | cut -f1))"
echo "👉 Puedes subir este archivo directamente a Moodle como entrega final."

