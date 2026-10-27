"""
Capa de persistencia y conexión a base de datos de la API.
Principio de Mínimo Privilegio:
La API se conecta EXCLUSIVAMENTE con el rol 'sismo_reader' y search_path 'curated'.
No tiene acceso a raw, staging ni a los metadatos de Airflow.
"""

import logging
from typing import Generator
from passlib.context import CryptContext
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from src.config import settings

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 1. Engine de lectura para la API (Rol de mínimo privilegio: sismo_reader)
engine = create_engine(
    settings.database_url,
    connect_args={"options": "-c search_path=curated"},
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Inyección de dependencias para sesiones de base de datos de solo lectura."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_initial_users() -> None:
    """
    Siembra los usuarios iniciales (admin y viewer) en curated.users si no existen.
    Usa la conexión de administración únicamente durante el arranque en frío.
    """
    admin_engine = create_engine(
        settings.admin_database_url,
        connect_args={"options": "-c search_path=curated"},
        pool_pre_ping=True
    )
    try:
        with admin_engine.connect() as conn:
            # 1. Sembrar admin
            check_admin = conn.execute(
                text("SELECT 1 FROM curated.users WHERE username = :user"),
                {"user": settings.ADMIN_USER}
            ).fetchone()
            if not check_admin:
                admin_hash = pwd_context.hash(settings.ADMIN_PASSWORD)
                conn.execute(
                    text("""
                        INSERT INTO curated.users (username, hashed_password, role, created_at)
                        VALUES (:user, :pwd, 'admin', CURRENT_TIMESTAMP)
                        ON CONFLICT (username) DO NOTHING;
                    """),
                    {"user": settings.ADMIN_USER, "pwd": admin_hash}
                )
                logger.info("👤 Usuario administrador sembrado exitosamente: %s", settings.ADMIN_USER)

            # 2. Sembrar viewer
            check_viewer = conn.execute(
                text("SELECT 1 FROM curated.users WHERE username = :user"),
                {"user": settings.VIEWER_USER}
            ).fetchone()
            if not check_viewer:
                viewer_hash = pwd_context.hash(settings.VIEWER_PASSWORD)
                conn.execute(
                    text("""
                        INSERT INTO curated.users (username, hashed_password, role, created_at)
                        VALUES (:user, :pwd, 'viewer', CURRENT_TIMESTAMP)
                        ON CONFLICT (username) DO NOTHING;
                    """),
                    {"user": settings.VIEWER_USER, "pwd": viewer_hash}
                )
                logger.info("👤 Usuario viewer sembrado exitosamente: %s", settings.VIEWER_USER)

            conn.commit()
    except Exception as e:
        logger.error("Error al sembrar usuarios iniciales: %s", str(e))
    finally:
        admin_engine.dispose()
