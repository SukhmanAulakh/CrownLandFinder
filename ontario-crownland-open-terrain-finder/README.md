# Ontario Crown Land Open Terrain Finder

GIS platform for identifying and verifying candidate areas for training and recreational shooting on Ontario Crown Land.

## Features

### Mapping
- **CLUPA overlays**: Crown Land Use Policy Atlas layers.
- **Basemaps**: Satellite and topographic; 3D terrain.
- **Control tray**: Collapsible layer and settings panel.

### Ballistic analysis
- **Point selection**: Firing and target positions on the map.
- **Terrain profiling**: Elevation profiles and line-of-sight.
- **Safety checks**: 10 km downrange intersection with roads/trails; backstop validation.
- **Markers**: Target and firing point icons.

### Measurement & sharing
- **Ruler**: Multi-node (up to 20) path with segment and total distance.
- **Deep links**: Share candidate, pins, and map state via URL; links restore view and trigger ballistic analysis.

## Tech stack

- **Frontend**: Next.js 14, React, Mapbox GL JS, Tailwind CSS.
- **Backend**: FastAPI, Celery, PostgreSQL + PostGIS.
- **Data**: GeoPandas (vectors), Rasterio (DEM/terrain).

## Project layout

| Directory | Purpose |
|-----------|---------|
| `frontend/` | Next.js map app |
| `backend/` | FastAPI API, DB, workers |
| `data_pipeline/` | Ingestion scripts, configs, raw data (see root [README](../README.md) for pipeline commands) |
| `docs/` | [Architecture](docs/architecture.md) and design |
| `infra/` | Dockerfiles |

## Getting started

See the root [README](../README.md) for:

- Prerequisites (Docker, Mapbox token)
- Quick start (`make build`, `make up`, `make apply-migrations`)
- Environment (`.env` from `.env.example`)
- Data pipeline ingestion order
- Testing

## Disclaimer

Preliminary screening only. Verify CLUPA policy, municipal bylaws, and site conditions before use.
