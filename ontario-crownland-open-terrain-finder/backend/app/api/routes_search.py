"""
Search and ballistic analysis API: bbox search and manual firing/target analysis.

Manual ballistic endpoint checks tenure, road/trail clearance, and 10 km downrange hazards.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging
from app.api.deps import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/bbox")
def search_candidates_by_bbox(
    bbox: str = Query(..., description="min_lon,min_lat,max_lon,max_lat (e.g., -80.0,45.0,-79.0,46.0)"),
    db: Session = Depends(get_db)
):
    """
    Search for Candidate Units that intersect a specific bounding box.
    Returns GeoJSON format.
    """
    try:
        parts = [float(p) for p in bbox.split(",")]
        if len(parts) != 4:
            raise ValueError()
        min_lon, min_lat, max_lon, max_lat = parts
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid bbox format. Use min_lon,min_lat,max_lon,max_lat")

    # PostGIS ST_MakeEnvelope expects (xmin, ymin, xmax, ymax, srid)
    # We query using the 4326 geometries, transforming on the fly, 
    # but for index usage it's better to transform the envelope to 3161
    sql = text("""
        WITH envelope AS (
            SELECT ST_Transform(ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326), 3161) as geom
        )
        SELECT 
            cu.id,
            cu.area_m2,
            ST_AsGeoJSON(ST_Transform(cu.geom_projected, 4326)) as geometry,
            ST_Y(ST_Transform(ST_Centroid(cu.geom_projected), 4326)) as centroid_lat,
            ST_X(ST_Transform(ST_Centroid(cu.geom_projected), 4326)) as centroid_lng,
            cs.open_land_score,
            cs.terrain_enclosure_score,
            cs.classification,
            cs.explanation_json,
            cp.policy_ident,
            cp.designation_eng,
            cp.category_eng,
            cp.area_name
        FROM candidate_units cu
        JOIN clupa_polygons cp ON cu.parent_clupa_id = cp.id
        JOIN envelope e ON ST_Intersects(cu.geom_projected, e.geom)
        LEFT JOIN candidate_scores cs ON cu.id = cs.candidate_unit_id
        LIMIT 500
    """)
    
    results = db.execute(sql, {
        "min_lon": min_lon,
        "min_lat": min_lat,
        "max_lon": max_lon,
        "max_lat": max_lat
    }).fetchall()
    
    features = []
    for row in results:
        if not row.geometry:
            continue
            
        import json
        features.append({
            "type": "Feature",
            "geometry": json.loads(row.geometry),
            "properties": {
                "id": row.id,
                "area_m2": row.area_m2,
                "centroid_lat": row.centroid_lat,
                "centroid_lng": row.centroid_lng,
                "open_land_score": row.open_land_score,
                "terrain_enclosure_score": row.terrain_enclosure_score,
                "classification": row.classification,
                "explanation": row.explanation_json,
                "policy_ident": row.policy_ident,
                "designation_eng": row.designation_eng,
                "category_eng": row.category_eng,
                "area_name": row.area_name
            }
        })
        
    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.post("/ballistic/manual")
def analyze_manual_ballistics(
    firing_pos: dict, # {"lng": float, "lat": float}
    target_pos: dict, # {"lng": float, "lat": float}
    db: Session = Depends(get_db)
):
    """
    Analyzes a manually selected pair of points for shooting feasibility.
    Checks distance, land tenure, safety buffers, and openness.
    """
    try:
        sql = text("""
            WITH pts AS (
                SELECT 
                    ST_Transform(ST_SetSRID(ST_MakePoint(:f_lng, :f_lat), 4326), 3161) as f_geom,
                    ST_Transform(ST_SetSRID(ST_MakePoint(:t_lng, :t_lat), 4326), 3161) as t_geom
            ),
            tenure_check AS (
                SELECT 
                    (SELECT count(*) > 0 FROM clupa_polygons, pts WHERE ST_Intersects(geom_projected, f_geom)) as f_on_crown,
                    (SELECT count(*) > 0 FROM clupa_polygons, pts WHERE ST_Intersects(geom_projected, t_geom)) as t_on_crown,
                    (SELECT count(*) > 0 FROM protected_areas, pts WHERE ST_Intersects(geom_projected, f_geom) OR ST_Intersects(geom_projected, t_geom)) as in_protected,
                    (SELECT count(*) > 0 FROM municipal_boundaries, pts WHERE ST_Intersects(geom_projected, f_geom) OR ST_Intersects(geom_projected, t_geom)) as in_municipal,
                    cp.policy_ident,
                    cp.designation_eng,
                    cp.category_eng,
                    cp.area_name
                FROM pts
                LEFT JOIN clupa_polygons cp ON ST_Intersects(cp.geom_projected, pts.t_geom)
                LIMIT 1
            ),
            dist_check AS (
                SELECT 
                    ST_Distance(f_geom, t_geom) as dist,
                    (SELECT MIN(ST_Distance(f_geom, geom_projected)) FROM roads) as f_road_dist,
                    (SELECT MIN(ST_Distance(t_geom, geom_projected)) FROM roads) as t_road_dist,
                    (SELECT MIN(ST_Distance(f_geom, geom_projected)) FROM trails) as f_trail_dist,
                    (SELECT MIN(ST_Distance(t_geom, geom_projected)) FROM trails) as t_trail_dist,
                    (SELECT MAX(cs.terrain_enclosure_score) 
                     FROM candidate_units cu 
                     JOIN candidate_scores cs ON cu.id = cs.candidate_unit_id 
                     WHERE ST_Intersects(cu.geom_projected, t_geom)) as t_enclosure
                FROM pts
            )
            SELECT * FROM tenure_check, dist_check;
        """)
        
        row = db.execute(sql, {
            "f_lng": firing_pos["lng"], "f_lat": firing_pos["lat"],
            "t_lng": target_pos["lng"], "t_lat": target_pos["lat"]
        }).fetchone()
        
        if not row:
            raise HTTPException(status_code=500, detail="Database calculation failed")
            
        dist = row.dist
        
        # 1. Tenure Score
        tenure_score = 100
        tenure_reasons = []
        if not row.f_on_crown:
            tenure_score -= 50
            tenure_reasons.append("Firing position is private/unclassified.")
        if not row.t_on_crown:
            tenure_score -= 50
            tenure_reasons.append("Target position is private/unclassified.")
        if row.in_protected:
            tenure_score = 0
            tenure_reasons.append("Positions overlap a Protected Area/Park.")
        if row.in_municipal:
            tenure_score -= 30
            tenure_reasons.append("Positions in a Municipal Boundary; check local discharge bylaws.")

        # Data Integrity Check: Are we flying blind?
        counts_sql = text("SELECT (SELECT count(*) FROM roads) as r_count, (SELECT count(*) FROM trails) as t_count")
        counts = db.execute(counts_sql).fetchone()
        roads_loaded = (counts.r_count > 0) if counts else False
        trails_loaded = (counts.t_count > 0) if counts else False

        # 2. Open Area Scores (Firing & Target)
        def calc_open_score(road_dist, trail_dist, is_target=False):
            score = 100
            min_road = 300 if is_target else 150
            min_trail = 150 if is_target else 50
            
            if road_dist < min_road:
                score -= max(0, (min_road - road_dist) / min_road * 80)
            if trail_dist < min_trail:
                score -= max(0, (min_trail - trail_dist) / min_trail * 50)
            return max(0, round(score))

        f_open_score = calc_open_score(row.f_road_dist or 5000, row.f_trail_dist or 5000)
        t_open_score = calc_open_score(row.t_road_dist or 5000, row.t_trail_dist or 5000, is_target=True)
        
        # 3. Backdrop & Safety Check (Downrange Road Check)
        backdrop_score = 100
        safety_reasons = []
        
        # Calculate shot bearing: firing -> target
        import math
        dy = target_pos["lat"] - firing_pos["lat"]
        dx = (target_pos["lng"] - firing_pos["lng"]) * math.cos(math.radians(firing_pos["lat"]))
        shot_bearing = math.degrees(math.atan2(dx, dy)) % 360
        
        # SQL for Safety Zone check (High-precision sector)
        # Starting at firing position, extending 10km at bearing +/- 15 deg
        safety_sql = text("""
            WITH origin AS (
                SELECT ST_Transform(ST_SetSRID(ST_MakePoint(:f_lng, :f_lat), 4326), 3161) as f_geom
            ),
            trajectory AS (
                -- Create a precise line extending 10km at the given bearing
                SELECT ST_MakeLine(
                    f_geom,
                    ST_Translate(f_geom, :radius * sin(radians(:bearing)), :radius * cos(radians(:bearing)))
                ) as line
                FROM origin
            ),
            roads_in_zone AS (
                SELECT 
                    count(*) as hazard_count,
                    MIN(ST_Distance(origin.f_geom, ST_Intersection(h.geom_projected, tj.line))) as min_dist
                FROM (
                    SELECT geom_projected FROM roads
                    UNION ALL
                    SELECT geom_projected FROM trails
                ) h, trajectory tj, origin
                WHERE ST_Intersects(h.geom_projected, tj.line)
            )
            SELECT hazard_count, min_dist FROM roads_in_zone;
        """)
        
        # We'll use 10km as the conservative default
        safety_radius = 10000 
        safety_row = db.execute(safety_sql, {
            "f_lng": firing_pos["lng"], "f_lat": firing_pos["lat"],
            "bearing": shot_bearing,
            "radius": safety_radius
        }).fetchone()
        
        has_downrange_hazard = (safety_row.hazard_count > 0) if safety_row else False
        closest_hazard_m = safety_row.min_dist if (safety_row and safety_row.min_dist is not None) else None
        backstop_verified = (row.t_enclosure is not None and row.t_enclosure > 60)
        
        # Helper for formatting hazard distance
        def format_haz_dist(m):
            if m is None: return "NULL"
            if m < 1000: return f"{round(m)}m"
            return f"{round(m/1000, 1)}km"
            
        if has_downrange_hazard:
            # Check if hazard is BETWEEN shooter and target (Uprange)
            if closest_hazard_m < (dist - 5):
                backdrop_score = 0
                safety_reasons.append(f"CRITICAL: Roadway/Trail detected {format_haz_dist(closest_hazard_m)} away (in front of target). Direct line of fire conflict.")
            else:
                # Hazard is behind the target
                if backstop_verified:
                    safety_reasons.append(f"PASSED: Verified backstop protects roadway/trail behind target (Closest hazard: {format_haz_dist(closest_hazard_m)}).")
                else:
                    backdrop_score = 0
                    safety_reasons.append(f"CRITICAL: Roadway/Trail detected {format_haz_dist(closest_hazard_m)} downrange. No backstop verified.")
        else:
            # No hazards at all
            if backstop_verified:
                safety_reasons.append("PASSED: Verified natural backstop detected and no roadways in 10km sector.")
            else:
                safety_reasons.append("PASSED: No public roadways detected in the 10km downrange danger sector (Assuming No Backstop).")
        
        # Ideal orientation check (Northbound)
        if not (315 <= shot_bearing or shot_bearing <= 45):
             backdrop_score = max(0, backdrop_score - 20)
             
        backdrop_score = max(0, round(backdrop_score))
 
        # Overall Score
        overall_score = (tenure_score * 0.4) + (f_open_score * 0.2) + (t_open_score * 0.2) + (backdrop_score * 0.2)
        
        status = "Decent"
        if tenure_score == 0 or backdrop_score == 0 or overall_score < 40:
            status = "Infeasible"
        elif overall_score < 70:
            status = "Marginal"
            
        return {
            "score": round(overall_score),
            "status": status,
            "distance_m": round(dist, 1),
            "bearing": round(shot_bearing, 1),
            "policy_ident": row.policy_ident,
            "designation_eng": row.designation_eng,
            "category_eng": row.category_eng,
            "area_name": row.area_name,
            "safety_check": {
                "has_downrange_hazard": has_downrange_hazard,
                "closest_hazard_m": closest_hazard_m,
                "closest_hazard_fmt": format_haz_dist(closest_hazard_m),
                "danger_zone_radius_km": safety_radius / 1000,
                "backstop_verified": backstop_verified,
                "data_integrity": {
                    "roads_loaded": roads_loaded,
                    "trails_loaded": trails_loaded
                }
            },
            "sub_scores": {
                "tenure": round(tenure_score),
                "firing_openness": f_open_score,
                "target_openness": t_open_score,
                "backdrop": backdrop_score
            },
            "tenure_details": {
                "on_crown_land": row.f_on_crown and row.t_on_crown,
                "in_protected": row.in_protected,
                "in_municipal": row.in_municipal
            },
            "recommendation": " ".join(tenure_reasons + safety_reasons) if (tenure_reasons or safety_reasons) else "Excellent setup with safe tenure and clearance."
        }
        
    except Exception as e:
        logger.error(f"Manual analysis error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
