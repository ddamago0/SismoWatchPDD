FROM apache/airflow:2.8.1-python3.11

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

USER airflow
COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir -r /requirements.txt

# Enlazar /opt/airflow/include dentro del paquete airflow para permitir imports 'from airflow.include...'
RUN mkdir -p /opt/airflow/include && \
    ln -s /opt/airflow/include /home/airflow/.local/lib/python3.11/site-packages/airflow/include
