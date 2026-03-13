from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api.deps import get_db

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
            cs.open_land_score,
            cs.terrain_enclosure_score,
            cs.classification,
            cs.explanation_json
        FROM candidate_units cu
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
                "open_land_score": row.open_land_score,
                "terrain_enclosure_score": row.terrain_enclosure_score,
                "classification": row.classification,
                "explanation": row.explanation_json
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
                    (SELECT count(*) > 0 FROM municipal_boundaries, pts WHERE ST_Intersects(geom_projected, f_geom) OR ST_Intersects(geom_projected, t_geom)) as in_municipal
                FROM pts
            ),
            dist_check AS (
                SELECT 
                    ST_Distance(f_geom, t_geom) as dist,
                    (SELECT MIN(ST_Distance(f_geom, geom_projected)) FROM roads) as f_road_dist,
                    (SELECT MIN(ST_Distance(t_geom, geom_projected)) FROM roads) as t_road_dist,
                    (SELECT MIN(ST_Distance(f_geom, geom_projected)) FROM trails) as f_trail_dist,
                    (SELECT MIN(ST_Distance(t_geom, geom_projected)) FROM trails) as t_trail_dist
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
        
        # 3. Backdrop Score (Simplified Orientation/Safety proxy)
        backdrop_score = 100
        # Check bearing: firing to target. Ideal is North (0 deg +/- 45) for backstop illumination/safety.
        # Calc bearing roughly
        import math
        dy = target_pos["lat"] - firing_pos["lat"]
        dx = (target_pos["lng"] - firing_pos["lng"]) * math.cos(math.radians(firing_pos["lat"]))
        bearing = math.degrees(math.atan2(dx, dy)) % 360
        
        if not (315 <= bearing or bearing <= 45): # Not Northbound
             backdrop_score -= 20
             
        # Penalty if target is very close to a road
        if (row.t_road_dist or 5000) < 500:
            backdrop_score -= (500 - row.t_road_dist) / 500 * 50
            
        backdrop_score = max(0, round(backdrop_score))

        # Overall Score
        overall_score = (tenure_score * 0.4) + (f_open_score * 0.2) + (t_open_score * 0.2) + (backdrop_score * 0.2)
        
        status = "Decent"
        if tenure_score == 0 or overall_score < 40:
            status = "Infeasible"
        elif overall_score < 70:
            status = "Marginal"
            
        return {
            "score": round(overall_score),
            "status": status,
            "distance_m": round(dist, 1),
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
            "recommendation": " ".join(tenure_reasons) if tenure_reasons else "Excellent setup with safe tenure and clearance."
        }
        
    except Exception as e:
        logger.error(f"Manual analysis error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
