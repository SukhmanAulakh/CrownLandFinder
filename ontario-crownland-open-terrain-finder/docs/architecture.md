# Architecture

## Overview

The Ontario Crown Land Open Terrain Finder is built across three main parts:

1. **Frontend (Next.js/React)** — Map UI, candidate list, ballistic controls, measurement tool, and deep-link state.
2. **Backend (FastAPI)** — Serves geospatial data (GeoJSON and MVT), search by bbox, and manual ballistic analysis.
3. **Data pipeline (Python)** — YAML-configured ETL: fetch from Ontario GeoHub/LIO, load into PostGIS with GeoPandas, run terrain/scoring (rasterio for DEMs). Can be triggered via Celery or run as scripts.

## API overview

| Prefix | Purpose |
|--------|--------|
| `/` (health) | Liveness: `{"status":"healthy","version":"1.0.0"}` |
| `/api/layers/candidates` | Candidate units as GeoJSON (paginated). Prefer `/api/layers/mvt/candidates/{z}/{x}/{y}` for large data. |
| `/api/layers/candidates/metadata` | Lightweight list (ids, scores, centroids) for sidebar and fly-to. |
| `/api/layers/base_layers/{name}` | Base layers (e.g. `clupa_polygons`, `roads`, `trails`) as GeoJSON. |
| `/api/layers/mvt/{layer_name}/{z}/{x}/{y}` | Mapbox Vector Tiles for all layers (production use). |
| `/api/search/bbox` | `GET ?bbox=min_lon,min_lat,max_lon,max_lat` — candidates in bbox as GeoJSON. |
| `/api/search/ballistic/manual` | `POST` with `firing_pos` and `target_pos` (lng/lat) — tenure, clearance, 10 km downrange hazard, backstop. |
| `/api/admin/` | Placeholder for admin/trigger endpoints. |

## Data flow

1. **Ingestion** — Pipeline scripts fetch GeoJSON into `data_pipeline/raw/`, then load into PostGIS (projected CRS). Candidate units are built from CLUPA minus exclusions; terrain and scoring run next.
2. **Serving** — Frontend requests MVT from backend; backend uses PostGIS `ST_AsMVT` for the requested tile. GeoJSON endpoints are for smaller result sets and metadata.
3. **Ballistic** — User picks firing and target on the map; frontend calls `/api/search/ballistic/manual`. Backend checks crown land, protected areas, roads/trails, and 10 km sector.

## User-facing tools

- **Manual ballistic scoring** — Firing/target points; terrain profile and hazard checks.
- **Measurement** — Multi-point (up to 20) ruler with segment and total distance (haversine).
- **Layer tray** — Basemap (outdoors/satellite), CLUPA overlays, 3D terrain, opacities.
- **Deep links** — State (candidate, pins, map view) encoded in URL; restore on load.

## Database and safety

- **PostgreSQL + PostGIS** — Geometries stored in a projected CRS (e.g. WKID 3161) for analysis; WKID 4269/4326 for ingestion and API output.
- **Safety** — Roads and trails ingested for 10 km downrange checks and backstop validation; results reflected in ballistic API and scoring.
