-- Base de datos aislada para los metadatos internos de Apache Airflow
SELECT 'CREATE DATABASE airflow_metadata'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'airflow_metadata')\gexec
