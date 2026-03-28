"""
Ontario Crown Land Open Terrain Finder — FastAPI application entry point.

Mounts health, layers, search, and admin routers; configures CORS from settings.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import routes_health, routes_layers, routes_search, routes_admin

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for the Ontario Crown Land Open Terrain Finder",
    version="1.0.0",
)

# Set all CORS enabled origins
origins = [str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS]
if not origins:
    origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_health.router, tags=["Health"])
app.include_router(routes_layers.router, prefix="/api/layers", tags=["Layers"])
app.include_router(routes_search.router, prefix="/api/search", tags=["Search"])
app.include_router(routes_admin.router, prefix="/api/admin", tags=["Admin"])
