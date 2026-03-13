import os
import logging
import time
from sqlalchemy import create_engine
import sys
sys.path.insert(0, "/app")
from app.services.candidate_service import CandidateBuilder
logger = logging.getLogger(__name__)

DB_USER = os.getenv("POSTGRES_USER", "crownland")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "crownland")
DB_HOST = os.getenv("DB_HOST", "db")
DB_NAME = os.getenv("POSTGRES_DB", "crownland_db")
DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}"

if __name__ == "__main__":
    logger.info("Creating SQLAlchemy Engine for Candidate Unit builder...")
    engine = create_engine(DB_URL)
    
    cb = CandidateBuilder(engine)
    logger.info("Step 1: Subdividing and Excluding...")
    cb.subdivide_and_exclude()
    
    logger.info("Step 2: Linking Municipalities...")
    cb.link_municipalities()
    
    logger.info("Candidate Builder Script Completed Successfully.")
