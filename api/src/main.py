"""
Punto de Entrada Principal de la API SismoWatch PDD (FastAPI).
Exclusivamente conectado a la capa curated con rol de solo lectura.
Autenticación JWT, RBAC estricto, CORS controlado y Streaming SSE.
"""

from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.config import settings
from src.database import seed_initial_users
from src.routers import (
    admin,
    ai_query,
    auth,
    events,
    kpis,
    pipeline,
    quality,
    reports,
    stats,
    stream,
)
from src.routers.auth import limiter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sismowatch_api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Iniciando SismoWatch API...")
    # Sembrar usuarios iniciales (admin y viewer)
    seed_initial_users()
    yield
    logger.info("🛑 Deteniendo SismoWatch API...")


app = FastAPI(
    title="SismoWatch PDD API",
    description="Plataforma de Consumo y Monitoreo Sísmico en Tiempo Real sobre Arquitectura Medallion.",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configurar CORS restringido
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Registrar Routers
app.include_router(auth.router)
app.include_router(kpis.router)
app.include_router(events.router)
app.include_router(stats.router)
app.include_router(reports.router)
app.include_router(stream.router)
app.include_router(pipeline.router)
app.include_router(quality.router)
app.include_router(admin.router)
app.include_router(ai_query.router)


@app.get("/health", tags=["Salud"])
def health_check():
    """Endpoint de comprobación de salud del servicio API."""
    return {"status": "healthy", "service": "sismowatch-api"}
