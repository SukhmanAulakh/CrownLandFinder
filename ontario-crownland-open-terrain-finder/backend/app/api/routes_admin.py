from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_admin():
    return {"status": "admin_api_placeholder"}
