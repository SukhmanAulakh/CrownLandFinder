FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies including GDAL and GEOS for PostGIS/GeoPandas
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

# Create requirements.txt inline or copy if exists - for now assuming a generic one or copying later
COPY backend/requirements.txt* /app/
# We will create requirements.txt soon.
RUN if [ -f "requirements.txt" ]; then pip install --no-cache-dir -r requirements.txt; fi

COPY backend /app/
COPY data_pipeline /data_pipeline/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
