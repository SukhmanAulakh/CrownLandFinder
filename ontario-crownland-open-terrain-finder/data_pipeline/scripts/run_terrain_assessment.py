import os
import sys
import logging
from pathlib import Path
from sqlalchemy import create_engine, text

sys.path.insert(0, "/app")
from app.services.scoring_service import ScoringEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_USER = os.getenv("POSTGRES_USER", "crownland")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "crownland")
DB_HOST = os.getenv("DB_HOST", "db")
DB_NAME = os.getenv("POSTGRES_DB", "crownland_db")
DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}"

CONFIG_PATH = Path(__file__).parent.parent / "configs" / "scoring_params.yaml"

def run_assessment():
    logger.info("Starting Terrain Assessment & Scoring Engine...")
    engine = create_engine(DB_URL)
    scorer = ScoringEngine(str(CONFIG_PATH))
    
    with engine.begin() as conn:
        logger.info("Computing proximities to Roads and Trails for all Candidate Units...")
        
        # We need the nearest road distance and nearest trail distance for every candidate
        # Doing this efficiently in PostGIS using ST_Distance and Lateral Joins or CTEs.
        
        proximity_sql = text("""
        WITH candidate_distances AS (
            SELECT 
                cu.id as candidate_id,
                cu.area_m2 as area_m2,
                (
                    SELECT MIN(ST_Distance(cu.geom_projected, r.geom_projected))
                    FROM roads r
                ) as dist_to_road_m,
                (
                    SELECT MIN(ST_Distance(cu.geom_projected, t.geom_projected))
                    FROM trails t
                ) as dist_to_trail_m
            FROM candidate_units cu
        )
        SELECT candidate_id, area_m2, dist_to_road_m, dist_to_trail_m 
        FROM candidate_distances;
        """)
        
        results = conn.execute(proximity_sql).fetchall()
        logger.info(f"Retrieved proximity data for {len(results)} candidates. Calculating scores...")
        
        scores_to_insert = []
        for row in results:
            cand_id = row[0]
            area = row[1]
            dist_road = row[2] if row[2] is not None else 10000.0 # Default max distance if no roads
            dist_trail = row[3] if row[3] is not None else 10000.0
            
            # Simulated Terrain Enclosure Score since we don't have DEM integration yet
            # In a real scenario, this would call raster extraction (ST_Value, etc)
            mock_terrain_score = 50.0 
            
            open_land_score = scorer.calculate_open_land_score(area, dist_road, dist_trail)
            classification = scorer.classify(open_land_score, mock_terrain_score, overlaps_exclusion=False)
            
            explanation = {
                "dist_road_m": round(dist_road, 2),
                "dist_trail_m": round(dist_trail, 2),
                "area_m2": round(area, 2),
                "dem_status": "mocked_enclosure"
            }
            
            scores_to_insert.append({
                "candidate_unit_id": cand_id,
                "open_land_score": open_land_score,
                "terrain_enclosure_score": mock_terrain_score,
                "classification": classification,
                "explanation_json": explanation,
                "scoring_version": "1.0.0-mock"
            })
            
        if not scores_to_insert:
            logger.warning("No candidates found to score.")
            return

        logger.info(f"Inserting {len(scores_to_insert)} computed scores...")
        import json
        
        # Clear existing scores to allow reruns
        conn.execute(text("TRUNCATE candidate_scores CASCADE;"))
        
        # Bulk insert
        from sqlalchemy import insert
        from app.db.models.spatial import CandidateScore
        conn.execute(insert(CandidateScore).values(scores_to_insert))
        
        logger.info("Terrain Assessment Complete.")

if __name__ == "__main__":
    run_assessment()
