# Data pipeline

ETL and scoring for Ontario Crown Land: fetch from LIO/GeoHub, load into PostGIS, build candidate units, run terrain and scoring.

## Configs

| File | Purpose |
|------|--------|
| `configs/datasets.yaml` | Data source URLs and layer definitions (CLUPA, roads, hydro, etc.) |
| `configs/buffers.yaml` | Buffer distances and geometry options |
| `configs/scoring.yaml` / `scoring_params.yaml` | Weights and thresholds for open-land and terrain-enclosure scores |

## Scripts (run order)

1. **Fetch** — download raw GeoJSON/vector data into `raw/` (gitignored):
   - `fetch_clupa.py` — Crown Land Use Policy Atlas
   - `fetch_roads.py`, `fetch_trails.py`, `fetch_hydro.py`, `fetch_protected_areas.py`, etc.

2. **Load** — `load_vectors.py` reads `raw/` and upserts into PostGIS (projected CRS).

3. **Build** — `build_candidate_units.py` subdivides CLUPA and applies exclusion masks (protected areas, etc.).

4. **Terrain & scoring** — `run_terrain_assessment.py`, `run_scoring.py` compute distances to roads/trails, DEM-based metrics, and classification.

Run from project root with the worker container (see root [README](../../README.md)):

```bash
docker-compose exec worker python -m data_pipeline.scripts.fetch_clupa
docker-compose exec worker python -m data_pipeline.scripts.load_vectors
# ... etc
```

## DB connection

Scripts use `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DB_HOST` (default `db` in Docker). Same as backend `.env`.
