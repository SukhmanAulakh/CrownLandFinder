.PHONY: up down build logs shell db db-shell worker-logs check-db

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
