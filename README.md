# Ontario Crown Land Open Terrain Finder

A production-quality full-stack GIS web application designed to help users visually identify Ontario Crown land candidate areas. The platform focuses on finding zones that are publicly accessible, feature open terrain, are near hills/enclosures, and explicitly avoid exclusion overlays.

> [!IMPORTANT]
> **DISCLAIMER**: This tool provides a preliminary terrain and land-status screen only. **You must verify current CLUPA policy, municipality-specific rules, access conditions, and the site itself before acting.**

---

## 🚀 Quick Start

Ensure **Docker Desktop** is running. To bootstrap the entire infrastructure (Database, Redis, Backend, Worker, Frontend):

```bash
make build
make up
make apply-migrations
```

### Access Points:
- **Map Frontend**: [http://localhost:3000](http://localhost:3000)
- **API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostGIS Database**: `postgres://crownland:crownland@localhost:5432/crownland_db`

---

## 🛠 Tech Stack

- **Frontend**: Next.js, Mapbox GL JS / Leaflet, Tailwind CSS.
- **Backend**: FastAPI (Python), SQLAlchemy, Alembic.
- **Task Queue**: Celery with Redis broker.
- **Database**: PostgreSQL with PostGIS extension.
- **Infrastructure**: Docker & Docker Compose.

---

## 📥 Ingestion Pipeline

The project features a robust, multi-step data ingestion and processing pipeline located in `data_pipeline/`.

### 1. Data Acquisition
Fetch raw GeoJSON/Vector data from Land Information Ontario (LIO) and other sources:
```bash
docker-compose exec worker python -m scripts.fetch_clupa
docker-compose exec worker python -m scripts.fetch_roads
docker-compose exec worker python -m scripts.fetch_hydro
docker-compose exec worker python -m scripts.fetch_protected_areas
```

### 2. Vector Loading
Process and load raw data into the PostGIS database:
```bash
docker-compose exec worker python -m scripts.load_vectors
```

### 3. Candidate Unit Generation
Subdivide land parcels and apply exclusion masks (e.g., private land, protected areas):
```bash
docker-compose exec worker python -m scripts.build_candidate_units
```

### 4. Terrain & Scoring
Perform terrain analysis and apply scoring logic based on `configs/scoring.yaml`:
```bash
docker-compose exec worker python -m scripts.run_terrain_assessment
docker-compose exec worker python -m scripts.run_scoring
```

---

## 📂 Repository Structure

- [**backend/**](file:///d:/Code/Personal/CrownLandFinder/ontario-crownland-open-terrain-finder/backend): FastAPI application, database models, and API endpoints.
- [**frontend/**](file:///d:/Code/Personal/CrownLandFinder/ontario-crownland-open-terrain-finder/frontend): Next.js mapping interface and dashboard.
- [**data_pipeline/**](file:///d:/Code/Personal/CrownLandFinder/ontario-crownland-open-terrain-finder/data_pipeline): ETL scripts, YAML configurations, and raw data management.
- [**infra/**](file:///d:/Code/Personal/CrownLandFinder/ontario-crownland-open-terrain-finder/infra): Dockerfiles for backend, worker, and frontend.
- [**docs/**](file:///d:/Code/Personal/CrownLandFinder/ontario-crownland-open-terrain-finder/docs): Technical specifications and architectural documentation.

---

## 🧪 Testing

Run backend unit tests:
```bash
docker-compose exec backend python -m unittest discover tests/
```

