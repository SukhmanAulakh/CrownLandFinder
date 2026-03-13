import os
from sqlalchemy import create_engine, text

DB_USER = os.getenv("POSTGRES_USER", "crownland")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "crownland")
DB_HOST = os.getenv("DB_HOST", "db")
DB_NAME = os.getenv("POSTGRES_DB", "crownland_db")
DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}"

if __name__ == "__main__":
    engine = create_engine(DB_URL)
    
    sql = """
    INSERT INTO candidate_scores (
        candidate_unit_id, 
        open_land_score, 
        terrain_enclosure_score, 
        classification,
        scoring_version,
        explanation_json
    )
    SELECT 
        id, 
        (70 + (id % 25))::float, -- Open Land Score between 70-95
        (55 + (id % 35))::float, -- Enclosure Score between 55-90
        CASE 
            WHEN (id % 10) > 7 THEN 'Higher open-terrain candidate'
            ELSE 'Candidate for manual review'
        END,
        '1.1-varied-mock',
        jsonb_build_object(
            'reason', 'Deterministic mock score for development variety',
            'id_seed', id
        )
    FROM candidate_units
    ON CONFLICT (candidate_unit_id) DO NOTHING;
    """
    
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM candidate_scores;"))
        conn.execute(text(sql))
        print("Successfully populated mock scores for all candidate units.")
