"""Health check endpoint for liveness/readiness probes."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def health_check() -> dict:
    """Returns service status and version."""
    return {"status": "healthy", "version": "1.0.0"}
