# Crown Land Finder 🇨🇦

A feature-rich, full-stack GIS platform for identifying, verifying, and analyzing candidate areas for training and recreational shooting on Ontario Crown Land.

> **Disclaimer**: This tool is for preliminary terrain and land-status screening only. Always verify current CLUPA policy, municipal bylaws, access conditions, and physical site safety before use.

---

## 🎯 How It Works

### 1. Identify Candidates
- The map automatically loads **Candidate Units**—areas prioritized for open terrain and Crown land tenure.
- High-priority areas are shaded in **Purple**; click any unit to see its detailed status and CLUPA policy.

### 2. Precision Ballistics
- Select a candidate unit to open its panel.
- Use the **Manual Analysis** tool to drop a **Firing Point** and a **Target Point**.
- The system automatically computes:
    - **Terrain Profile**: Interactive elevation chart between the points.
    - **LOS (Line of Sight)**: Verification of clear shooting lanes.
    - **Safety Check**: Automated 10km downrange sweep for roads, trails, and water.

### 3. Measurement Ruler
- Activate the **Ruler Tool** (top right) to place up to 20 nodes.
- View real-time **geodesic distances** (Haversine formula) for segments and total path length.

### 4. Share Your Setup
- Encapsulate your entire map state (pins, zoom, selection) into a single URL using the **Share** button.
- Perfect for saving candidates or coordinating with others.

---

## 🛠 Tech Stack

| Component | Technology |
|:--- |:--- |
| **Frontend** | Next.js 14 (App Router), Mapbox GL JS, Tailwind CSS |
| **Backend** | FastAPI (Python 3.10+), SQLAlchemy + Alembic |
| **Analysis** | GeoPandas, Rasterio (DEM processing), PostGIS |
| **Infrastructure** | Docker, Celery (Async tasks), Redis |

---

## 📂 Repository Structure

| Path | Purpose |
|:--- |:--- |
| [`frontend/`](./ontario-crownland-open-terrain-finder/frontend) | Next.js Mapping Interface |
| [`backend/`](./ontario-crownland-open-terrain-finder/backend) | FastAPI Geospatial Service |
| [`data_pipeline/`](./ontario-crownland-open-terrain-finder/data_pipeline) | ETL & Terrain Analysis Scripts |
| [`docs/`](./ontario-crownland-open-terrain-finder/docs) | [Architecture](docs/architecture.md) & Technical Specs |

---

## 🚦 Getting Started

### Prerequisites
- Docker Desktop
- Mapbox Access Token ([Get one here](https://account.mapbox.com/))

### Installation
1. Clone the repository and enter the project directory:
   ```bash
   cd ontario-crownland-open-terrain-finder
   ```
2. Configure your environment:
   ```bash
   cp .env.example .env
   # Set NEXT_PUBLIC_MAPBOX_TOKEN in .env
   ```
3. Boot the stack:
   ```bash
   make up
   make apply-migrations
   ```

### Running the Data Pipeline
To populate the map with Ontario data, run these internal commands:
```bash
docker-compose exec worker python -m data_pipeline.scripts.fetch_clupa
docker-compose exec worker python -m data_pipeline.scripts.load_vectors
docker-compose exec worker python -m data_pipeline.scripts.build_candidate_units
docker-compose exec worker python -m data_pipeline.scripts.run_terrain_assessment
```

---

*Verified for production-ready GIS analysis in Ontario, Canada.*

---

## Data pipeline (ingestion)

Run inside the worker container (from `ontario-crownland-open-terrain-finder/`):

```bash
# 1. Fetch raw data from LIO/GeoHub
docker-compose exec worker python -m data_pipeline.scripts.fetch_clupa
docker-compose exec worker python -m data_pipeline.scripts.fetch_roads
docker-compose exec worker python -m data_pipeline.scripts.fetch_hydro
docker-compose exec worker python -m data_pipeline.scripts.fetch_protected_areas

# 2. Load vectors into PostGIS
docker-compose exec worker python -m data_pipeline.scripts.load_vectors

# 3. Build candidate units (exclusion masks)
docker-compose exec worker python -m data_pipeline.scripts.build_candidate_units

# 4. Terrain and scoring
docker-compose exec worker python -m data_pipeline.scripts.run_terrain_assessment
docker-compose exec worker python -m data_pipeline.scripts.run_scoring
```

---

## Testing

Backend tests (from `ontario-crownland-open-terrain-finder/`):

```bash
docker-compose exec backend python -m pytest tests/ -v
```
