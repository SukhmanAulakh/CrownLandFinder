"""
Admin API routes (placeholder).

Intended for triggering data ingestion, migrations, or other privileged operations.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_admin() -> dict:
    """Health/placeholder for admin API."""
    return {"status": "admin_api_placeholder"}
