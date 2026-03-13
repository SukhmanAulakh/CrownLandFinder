from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.services.ballistic_service import find_ballistic_setup

router = APIRouter()

@router.get("/{candidate_id}/ballistic-search")
def get_ballistic_search(candidate_id: int, db: Session = Depends(get_db)):
    """
    Identifies optimal firing and target positions within a candidate area.
    """
    result = find_ballistic_setup(candidate_id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Could not determine a valid ballistic setup for this area.")
    return result
