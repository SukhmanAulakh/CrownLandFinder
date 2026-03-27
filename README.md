# Crown Land Finder 🇨🇦

A feature-rich, full-stack GIS platform for identifying, verifying, and analyzing candidate areas for training and recreational shooting on Ontario Crown Land.

> **Disclaimer**: This tool is for preliminary terrain and land-status screening only. Always verify current CLUPA policy, municipal bylaws, access conditions, and physical site safety before acting.

---

## 🎯 Features & How It Works

### 1. Identify Candidate Areas
- The map automatically loads **Candidate Units**—areas prioritized for open terrain and Crown land tenure.
- High-priority areas are shaded in **Purple**; clicking any unit reveals its detailed land status, terrain breakdown, and direct links to CLUPA policy reports.

### 2. Precision Ballistics & Safety Sweep
- Select a candidate unit to open its details panel.
- Use the **Manual Analysis** tool to drop a **Firing Point** and a **Target Point** on the map.
- The system automatically computes:
    - **Terrain Profile**: Interactive elevation charting between the points.
    - **LOS (Line of Sight)**: Verification of clear shooting lanes.
    - **Safety Check**: Automated 10km downrange sweep ensuring no roads, trails, or waterways intersect your line of fire securely.

### 3. Tactical Measurement Ruler
- Activate the **Ruler Tool** (floating button on the right) to plot multi-point paths.
- Add up to 20 nodes to instantly view real-time **geodesic distances** for individual segments and total path length. The UI dynamically shifts to accommodate your workspace.

### 4. Share Your Setup (Deep-Linking)
- Encapsulate your entire map state (candidate selection, firing pins, target pins) into a single URL using the **Copy Share Link** button. 
- Perfect for saving setups, coordinating with friends, or submitting plans.

### 5. Collapsible Map Settings Layer
- Utilize the glassmorphic, collapsible map tray on the right to freely toggle candidate opacities, CLUPA overlays, and 3D terrain without cluttering your screen space.

---

## 🛠 Tech Stack

| Layer | Technology |
|:--- |:--- |
| **Frontend** | Next.js 14 (App Router), Mapbox GL JS, Tailwind CSS |
| **Backend** | FastAPI (Python 3.10+), SQLAlchemy + Alembic |
| **Analysis Engine** | GeoPandas, Rasterio (DEM processing), PostGIS |
| **Infrastructure** | Docker, Celery (Async tasks), Redis |

---

## 🚀 How to Deploy For Free

Deploying this software requires hosting a Next.js frontend, a Python FastAPI backend, and a PostgreSQL (PostGIS) database. Here is the easiest, zero-cost way to get this running online.

### Step 1: Database (Supabase)
1. Go to [Supabase](https://supabase.com/) and create a free project.
2. In the Supabase SQL editor, enable PostGIS by running: `CREATE EXTENSION postgis;`
3. Copy your database connection string (URI) from the project settings.

### Step 2: Backend (Render.com)
1. Go to [Render](https://render.com/) and create a free **Web Service**.
2. Connect your GitHub repository and set the Root Directory to `backend/`.
3. Set the build command to: `pip install -r requirements.txt && alembic upgrade head`
4. Set the start command to: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
5. Add the following Environment Variables:
   - `DATABASE_URL` -> (Paste your Supabase URI here. Remember to change `postgres://` to `postgresql://`)
   - `FRONTEND_URL` -> (Your future Vercel URL, or `*` for now)

### Step 3: Frontend (Vercel)
1. Go to [Vercel](https://vercel.com/) and import your GitHub repository.
2. Set the Root Directory to `frontend/`.
3. Add the following Environment Variables:
   - `NEXT_PUBLIC_API_URL` -> (Your Render backend URL, e.g., `https://crownland-backend.onrender.com`)
   - `NEXT_PUBLIC_MAPBOX_TOKEN` -> (Your free Mapbox token from mapbox.com)
4. Click **Deploy**.

> **Note on Data Pipeline**: The free tier covers the hosting, but to ingest the initial Ontario Crown Land massive datasets (the `data_pipeline` scripts), run the Docker commands locally on your PC while temporarily aiming your `.env` Database URL to the live Supabase instance. Once the initial data is ingested, the app runs completely standalone.

---

## 🚦 Local Development

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

### Running the Data Pipeline (Local Ingestion)
To populate the map with Ontario data, run these internal script commands:
```bash
# 1. Fetch raw data from LIO/GeoHub
docker-compose exec worker python -m data_pipeline.scripts.fetch_clupa
docker-compose exec worker python -m data_pipeline.scripts.fetch_roads

# 2. Load vectors into PostGIS
docker-compose exec worker python -m data_pipeline.scripts.load_vectors

# 3. Build candidate units (exclusion masks)
docker-compose exec worker python -m data_pipeline.scripts.build_candidate_units

# 4. Terrain and scoring
docker-compose exec worker python -m data_pipeline.scripts.run_terrain_assessment
```

---

*Verified for production-ready GIS analysis in Ontario, Canada.*
