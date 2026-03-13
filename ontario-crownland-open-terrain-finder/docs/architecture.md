# Architecture

## Overview
The Ontario Crown Land Open Terrain Finder is built across three primary boundaries:
1. **Frontend (Next.js/React)**: Provides the map interface, candidate scoring views, and admin controls.
2. **Backend (FastAPI)**: Serves public reading of geospatial data and provides admin trigger points to kick off data loads.
3. **Data Pipeline (Python/Celery)**: Configured via YAML, fetches datasets from Ontario GeoHub / LIO REST endpoints, loads them into PostGIS via GeoPandas, computes spatial differences, and triggers terrain array metrics using rasterio on DEMs.

## Constraints & Behaviors
- The app stores external identifiers (`POLICY_IDENT`) but abstains from text-parsing legal assertions.
- Hard exclusions map over areas with negative restrictions. 
- Warning banners are injected centrally on all candidate views.

## Database
- PostgreSQL + PostGIS extension.
- **Dual CRS storage**: Native WKID 4269 for ingestion. Projected WKID 3161 for analysis buffering and terrain clipping.
