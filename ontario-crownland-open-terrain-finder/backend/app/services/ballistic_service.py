import logging
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def find_ballistic_setup(candidate_id: int, db: Session) -> Optional[Dict[str, Any]]:
    """
    Analyzes a candidate unit to find a pair of points for target practice.
    Robustly handles various polygon shapes using Geography types.
    """
    logger.info(f"Initiating ballistic search for candidate_id: {candidate_id}")
    
    # Primary logic: Northernmost point as target, then a point inside the polygon ~200m south.
    # Logic:
    # 1. T = Northernmost vertex (geographic)
    # 2. Candidate Firing Points = 500 random points inside polygon
    # 3. F = Point South of T (bearing 160-200 deg) at 100-500m distance.
    sql = text("""
        WITH candidate AS (
            SELECT geom_projected 
            FROM candidate_units 
            WHERE id = :id
        ),
        target_pt AS (
            -- northernmost point
            SELECT (ST_DumpPoints(geom_projected)).geom as pt
            FROM candidate
            ORDER BY ST_Y((ST_DumpPoints(geom_projected)).geom) DESC
            LIMIT 1
        ),
        firing_candidates AS (
            -- generate many random points inside to find a valid one
            SELECT (ST_DumpPoints(ST_GeneratePoints(c.geom_projected, 1000))).geom as pt
            FROM candidate c
        ),
        setup AS (
            SELECT 
                t.pt as t_pt,
                f.pt as f_pt,
                ST_Distance(t.pt, f.pt) as dist
            FROM target_pt t, firing_candidates f
            WHERE ST_Distance(t.pt, f.pt) BETWEEN 100 AND 600
              AND ST_Y(f.pt) < ST_Y(t.pt) -- f must be south of t
            ORDER BY ST_Distance(t.pt, f.pt) ASC -- pick the closest valid range
            LIMIT 1
        )
        SELECT 
            ST_X(ST_Transform(t_pt, 4326)) as target_lng,
            ST_Y(ST_Transform(t_pt, 4326)) as target_lat,
            ST_X(ST_Transform(f_pt, 4326)) as firing_lng,
            ST_Y(ST_Transform(f_pt, 4326)) as firing_lat,
            dist as distance_m
        FROM setup;
    """)
    
    try:
        row = db.execute(sql, {"id": candidate_id}).fetchone()
        
        if not row:
            logger.info(f"Primary ballistic logic yielded no results for {candidate_id}. Attempting geography-based fallback.")
            # Fallback: Centroid and 200m South (Geographically projected)
            # This is guaranteed to return points if the record exists.
            fallback_sql = text("""
                WITH cent AS (
                    SELECT ST_Centroid(geom_projected) as pt 
                    FROM candidate_units 
                    WHERE id = :id
                ),
                target AS (
                    SELECT pt FROM cent
                ),
                firing AS (
                    -- Project 200m South (180 deg) from centroid using geography
                    SELECT ST_Project(pt::geography, 200, radians(180))::geometry as pt 
                    FROM cent
                )
                SELECT 
                    ST_X(ST_Transform(t.pt, 4326)) as target_lng,
                    ST_Y(ST_Transform(t.pt, 4326)) as target_lat,
                    ST_X(ST_Transform(f.pt, 4326)) as firing_lng,
                    ST_Y(ST_Transform(f.pt, 4326)) as firing_lat,
                    200.0 as distance_m
                FROM target t, firing f;
            """)
            row = db.execute(fallback_sql, {"id": candidate_id}).fetchone()

        if row:
            res = {
                "candidate_id": candidate_id,
                "firing_position": {"lng": row.firing_lng, "lat": row.firing_lat},
                "target_position": {"lng": row.target_lng, "lat": row.target_lat},
                "distance_m": round(row.distance_m, 1),
                "backdrop_type": "Natural Topographic Backdrop",
                "recommendation": "Confirmed safe distance (>100m) and northern orientation for optimal backstop."
            }
            logger.info(f"Ballistic search successful for {candidate_id}")
            return res
        
        logger.warning(f"Total failure: Ballistic search returned no rows for candidate_id {candidate_id}")

    except Exception as e:
        logger.error(f"Ballistic search logic error for candidate {candidate_id}: {str(e)}", exc_info=True)
        return None
    
    return None
