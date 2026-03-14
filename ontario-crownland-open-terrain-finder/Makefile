.PHONY: up down build logs shell db db-shell worker-logs check-db apply-migrations create-migration
.PHONY: ingest-fetch ingest-load ingest-candidates ingest-terrain ingest-scoring ingest-full

# PYTHONPATH so worker finds data_pipeline (mounted at /data_pipeline, not under /app)
DP = PYTHONPATH=/

up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose build

logs:
	docker-compose logs -f

shell:
	docker-compose exec backend bash

db:
	docker-compose exec db psql -U crownland -d crownland_db

db-shell:
	docker-compose exec db bash

worker-logs:
	docker-compose logs -f worker

apply-migrations:
	docker-compose exec backend alembic upgrade head

create-migration:
	docker-compose exec backend alembic revision --autogenerate -m "$(m)"

# --- Full Ontario data ingestion (run after: make build up apply-migrations) ---
ingest-fetch:
	$(DP) docker-compose exec -T worker python -m data_pipeline.scripts.fetch_clupa
	$(DP) docker-compose exec -T worker python -m data_pipeline.scripts.fetch_roads
	$(DP) docker-compose exec -T worker python -m data_pipeline.scripts.fetch_trails
	$(DP) docker-compose exec -T worker python -m data_pipeline.scripts.fetch_hydro
	$(DP) docker-compose exec -T worker python -m data_pipeline.scripts.fetch_protected_areas
	$(DP) docker-compose exec -T worker python -m data_pipeline.scripts.fetch_municipal_boundaries

ingest-load:
	$(DP) docker-compose exec -T worker python -m data_pipeline.scripts.load_vectors

ingest-candidates:
	docker-compose exec -T worker python /data_pipeline/scripts/build_candidate_units.py

ingest-terrain:
	$(DP) docker-compose exec -T worker python -m data_pipeline.scripts.run_terrain_assessment

ingest-scoring:
	$(DP) docker-compose exec -T worker python -m data_pipeline.scripts.run_scoring

# Full pipeline: fetch → load → build candidates → terrain → scoring (fetch can take 30+ min for Ontario)
ingest-full: ingest-fetch ingest-load ingest-candidates ingest-terrain ingest-scoring
