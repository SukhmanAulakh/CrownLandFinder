# Ontario Crown Land Open Terrain Finder
A web GIS platform that helps users visually find Ontario Crown land candidate areas that are publicly accessible, open, near hills/enclosures, and explicitly avoid exclusion zones.

> **IMPORTANT DISCLAIMER**: This result is a preliminary terrain and land-status screen only. **You must verify current CLUPA policy, municipality-specific rules, access conditions, and the site itself before acting.**

## Quick Start
Ensure Docker Desktop is running. To bootstrap the infrastructure and run the application:

```bash
make up
```

Alternatively, `docker-compose up -d`.

### Access:
- Map Frontend: http://localhost:3000
- Admin Portal: http://localhost:3000/admin/import
- API / Swagger: http://localhost:8000/docs
- Database: `postgres://crownland:crownland@localhost:5432/crownland_db`

## Running Ingestion Pipelines (Local execution)
Pipelines are stored in `data_pipeline/scripts/*`.
```bash
docker-compose exec worker python -m scripts.fetch_clupa
docker-compose exec worker python -m scripts.load_vectors
docker-compose exec worker python -m scripts.build_candidate_units
```

## Testing
Run unit tests across logic:
```bash
docker-compose exec backend python -m unittest discover tests/
```

## Repository Structure
- `/backend`: The FastAPI PostGIS middleware.
- `/frontend`: The Next.js Leaflet Map Platform.
- `/data_pipeline`: Yaml configs and ETL scripts for pulling LIO Services.
- `/infra`: Dockerfile builds.
- `/docs`: Technical architectural specs.
