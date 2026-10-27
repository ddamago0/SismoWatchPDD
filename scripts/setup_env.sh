#!/usr/bin/env bash
# ==============================================================================
# SismoWatch PDD - Generador Seguro de Variables de Entorno (.env)
# ==============================================================================
# Genera un archivo .env criptográficamente seguro a partir de .env.example con:
#   - Contraseñas aleatorias para PostgreSQL (admin, ingest, transform, reader)
#   - Fernet key válida de 32 bytes para Airflow
#   - Secret Key aleatoria para la interfaz web de Airflow
#   - Secret Key de 64 caracteres para JWT en FastAPI
#   - Contraseñas seguras para usuarios iniciales (admin y viewer)
#   - Preservación / inyección de API Keys de IA (Gemini y Groq)
#   - Verificación de puertos libres en el host
# ==============================================================================
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${repo_root}/.env"
template="${repo_root}/.env.example"
force=0

usage() {
  cat <<'HELP'
Uso: scripts/setup_env.sh [--force]

  (sin opciones)  Genera el .env si no existe. Si ya existe, lo conserva.
  --force         Regenera el .env desde la plantilla. El archivo anterior
                  se respalda como .env.bak-<timestamp>.
HELP
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --force) force=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opción desconocida: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [ ! -f "$template" ]; then
  echo "ERROR: No se encontró la plantilla $template" >&2
  exit 1
fi

if [ -f "$env_file" ] && [ "$force" -eq 0 ]; then
  echo "ℹ️  El archivo .env ya existe y se conserva tal cual."
  echo "   Para regenerarlo: bash scripts/setup_env.sh --force"
  exit 0
fi

if [ -f "$env_file" ]; then
  backup="${env_file}.bak-$(date +%Y%m%d-%H%M%S)"
  cp "$env_file" "$backup"
  echo "📦 Respaldo del .env anterior guardado en: $backup"
fi

python3 - "$template" "$env_file" <<'PY'
import base64
import os
import re
import secrets
import socket
import sys

template_path, out_path = sys.argv[1], sys.argv[2]

def secure_password(length=24):
    return secrets.token_urlsafe(length)

def fernet_key():
    return base64.urlsafe_b64encode(os.urandom(32)).decode()

def port_is_free(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(("0.0.0.0", port))
            return True
        except OSError:
            return False

def pick_port(desired, attempts=50):
    for candidate in range(desired, desired + attempts):
        if port_is_free(candidate):
            return candidate
    raise SystemExit(f"ERROR: No se encontró ningún puerto libre a partir de {desired}")

# Leer plantilla
values = {}
with open(template_path, encoding="utf-8") as f:
    for line in f:
        m = re.match(r"^([A-Z_][A-Z0-9_]*)=", line)
        if m:
            values[m.group(1)] = line.split("=", 1)[1].strip()

# Rescatar API Keys previas del entorno si existen
gemini_key = os.getenv("GEMINI_API_KEY", values.get("GEMINI_API_KEY", ""))
groq_key = os.getenv("GROQ_API_KEY", values.get("GROQ_API_KEY", ""))

postgres_port = pick_port(int(values.get("POSTGRES_PORT", 5432)))
airflow_port = pick_port(int(values.get("AIRFLOW_UI_PORT", 8080)))
api_port = pick_port(int(values.get("API_PORT", 8000)))
frontend_port = pick_port(int(values.get("FRONTEND_PORT", 3000)))

updates = {
    "POSTGRES_PASSWORD": secure_password(28),
    "POSTGRES_PORT": str(postgres_port),
    "INGEST_PASSWORD": secure_password(24),
    "TRANSFORM_PASSWORD": secure_password(24),
    "READ_PASSWORD": secure_password(24),
    "AIRFLOW_UI_PORT": str(airflow_port),
    "AIRFLOW__CORE__FERNET_KEY": fernet_key(),
    "AIRFLOW__CORE__SECRET_KEY": secrets.token_hex(32),
    "AIRFLOW_ADMIN_PASSWORD": secure_password(20),
    "API_PORT": str(api_port),
    "JWT_SECRET_KEY": secrets.token_hex(32),
    "ADMIN_PASSWORD": secure_password(20),
    "VIEWER_PASSWORD": secure_password(20),
    "FRONTEND_PORT": str(frontend_port),
    "VITE_API_URL": f"http://localhost:{api_port}",
    "CORS_ORIGINS": f"http://localhost:{frontend_port},http://127.0.0.1:{frontend_port}",
}

if gemini_key and "your_gemini" not in gemini_key:
    updates["GEMINI_API_KEY"] = gemini_key
if groq_key and "your_groq" not in groq_key:
    updates["GROQ_API_KEY"] = groq_key

# Reescribir respetando comentarios
output_lines = []
written_keys = set()

with open(template_path, encoding="utf-8") as f:
    for line in f:
        m = re.match(r"^([A-Z_][A-Z0-9_]*)=", line)
        if m:
            key = m.group(1)
            if key in updates:
                output_lines.append(f"{key}={updates[key]}")
                written_keys.add(key)
            else:
                output_lines.append(line.rstrip("\n"))
        else:
            output_lines.append(line.rstrip("\n"))

with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines) + "\n")

os.chmod(out_path, 0o600)
print(f"✅ Archivo .env generado exitosamente en: {out_path} (permisos 0600)")
print("   Configuración de puertos asignados:")
print(f"   - PostgreSQL:    {postgres_port}")
print(f"   - Airflow UI:    http://localhost:{airflow_port}")
print(f"   - Backend API:   http://localhost:{api_port}/docs")
print(f"   - Frontend Web:  http://localhost:{frontend_port}")
PY

chmod +x scripts/setup_env.sh
