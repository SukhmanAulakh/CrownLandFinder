FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies including GDAL and GEOS
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip
RUN pip install --upgrade pip

COPY backend/requirements.txt* /app/
RUN if [ -f "requirements.txt" ]; then pip install --no-cache-dir -r requirements.txt; fi

COPY backend /app/
COPY data_pipeline /data_pipeline/

CMD ["celery", "-A", "app.workers.tasks", "worker", "--loglevel=info"]
