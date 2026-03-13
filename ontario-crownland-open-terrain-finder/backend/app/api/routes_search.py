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
