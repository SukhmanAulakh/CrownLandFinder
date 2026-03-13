import os
import logging
from pathlib import Path
from sqlalchemy import create_engine
from app.services.scoring_service import ScoringEngine
from app.services.terrain_service import TerrainAnalyzer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CONFIG_PATH = Path(__file__).parent.parent / "configs" / "scoring.yaml"

DB_USER = os.getenv("POSTGRES_USER", "crownland")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "crownland")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("POSTGRES_DB", "crownland_db")
DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}"

def run_scoring_pipeline():
    logger.info("Initializing Scoring Engine...")
    engine = create_engine(DB_URL)
    scoring = ScoringEngine(str(CONFIG_PATH))
    
    # Conceptually:
    # 1. Fetch all candidate units without a score via SQLAlchemy models or raw SQL.
    # 2. Extract terrain proxy / DEM bounding box
    # 3. Calculate metrics
    # 4. Insert into candidate_scores table
    
    logger.info("Simulating scoring generation loop...")
    
    # Fake metrics
    open_land_s = scoring.calculate_open_land_score(50000, 2000, 3000)
    ter_enc_s = TerrainAnalyzer.terrain_enclosure_score(150, 0.4, 15)
    _class = scoring.classify(open_land_s, ter_enc_s, overlaps_exclusion=False)
    
    logger.info(f"Sample Candidate Output -> Open: {open_land_s:.1f}, Terrain: {ter_enc_s:.1f}, Class: '{_class}'")
    logger.info("Scoring Pipeline execution finished.")

if __name__ == "__main__":
    run_scoring_pipeline()
