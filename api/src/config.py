"""
Configuración centralizada de la API de SismoWatch mediante Pydantic Settings.
Lee las variables de entorno de forma tipada y segura.
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Base de Datos PostgreSQL (Conexión de solo lectura a capa curated)
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "sismowatch"
    READ_USER: str = "sismo_reader"
    READ_PASSWORD: str = ""
    
    # Credenciales de administración para seed inicial
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""

    # Seguridad JWT
    JWT_SECRET_KEY: str = "insecure_default_secret_key_change_me_immediately_12345"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # Sembrado de usuarios iniciales
    ADMIN_USER: str = "admin"
    ADMIN_PASSWORD: str = "AdminSismo2026!"
    VIEWER_USER: str = "viewer"
    VIEWER_PASSWORD: str = "ViewerSismo2026!"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Airflow REST API
    AIRFLOW_API_URL: str = "http://airflow-webserver:8080/api/v1"
    AIRFLOW_ADMIN_USER: str = "admin"
    AIRFLOW_ADMIN_PASSWORD: str = "admin"

    @property
    def database_url(self) -> str:
        """URL de conexión para el rol de lectura estricta sobre schema curated."""
        return (
            f"postgresql+psycopg2://{self.READ_USER}:{self.READ_PASSWORD}@"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def admin_database_url(self) -> str:
        """URL de administración para el sembrado inicial de usuarios."""
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
