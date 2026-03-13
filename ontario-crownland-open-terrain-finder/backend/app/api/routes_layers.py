from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api.deps import get_db

router = APIRouter()

@router.get("/candidates")
def get_candidate_units(limit: int = 1000, offset: int = 0, db: Session = Depends(get_db)):
    """
    Returns candidate units and their latest computed scores as GeoJSON.
    NOTE: For high-performance mapping, use the /mvt endpoint.
    """
    # Safety clamp to prevent jsonb overflow
    limit = min(limit, 5000)
    
    sql = text("""
        SELECT jsonb_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(jsonb_agg(f.feature), '[]'::jsonb),
            'properties', jsonb_build_object(
                'limit', :limit,
                'offset', :offset,
                'note', 'GeoJSON is truncated for performance. Use /mvt for full dataset mapping.'
            )
        )
        FROM (
            SELECT jsonb_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(ST_Transform(cu.geom_projected, 4326))::jsonb,
                'properties', jsonb_build_object(
                    'id', cu.id,
                    'area_m2', cu.area_m2,
                    'open_land_score', cs.open_land_score,
                    'terrain_enclosure_score', cs.terrain_enclosure_score,
                    'classification', cs.classification,
                    'explanation', cs.explanation_json
                )
            ) AS feature
            FROM candidate_units cu
            LEFT JOIN candidate_scores cs ON cu.id = cs.candidate_unit_id
            LIMIT :limit OFFSET :offset
        ) f;
    """)
    
    result = db.execute(sql, {"limit": limit, "offset": offset}).scalar()
    return result if result else {"type": "FeatureCollection", "features": []}

@router.get("/candidates/metadata")
def get_candidates_metadata(db: Session = Depends(get_db)):
    """
    Returns a lightweight list of candidate units for the sidebar and count.
    No heavy geometries - just IDs, scores, and centroids for flying to.
    """
    sql = text("""
        SELECT 
            cu.id,
            cu.area_m2,
            ST_X(ST_Transform(cu.centroid, 4326)) as lng,
            ST_Y(ST_Transform(cu.centroid, 4326)) as lat,
            cs.open_land_score,
            cs.terrain_enclosure_score,
            cs.classification
        FROM candidate_units cu
        LEFT JOIN candidate_scores cs ON cu.id = cs.candidate_unit_id
        ORDER BY cu.centroid <-> ST_Transform(ST_SetSRID(ST_MakePoint(-79.38, 43.65), 4326), 3161)
        LIMIT 5000 
    """)
    
    results = db.execute(sql).fetchall()
    count_sql = text("SELECT count(*) FROM candidate_units")
    total_count = db.execute(count_sql).scalar()
    
    features = []
    for row in results:
        features.append({
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates": [row.lng, row.lat] },
            "properties": {
                "id": row.id,
                "area_m2": row.area_m2,
                "open_land_score": row.open_land_score,
                "terrain_enclosure_score": row.terrain_enclosure_score,
                "classification": row.classification
            }
        })
        
    return {
        "count": len(features),
        "total_available": total_count,
        "features": features
    }

@router.get("/base_layers/{layer_name}")
def get_base_layer(layer_name: str, limit: int = 2000, offset: int = 0, db: Session = Depends(get_db)):
    """
    Returns generic base polygon layers (CLUPA, protected areas, etc) as GeoJSON.
    NOTE: For high-performance mapping, use the /mvt endpoint.
    """
    valid_tables = {
        "clupa_polygons": "clupa_polygons",
        "protected_areas": "protected_areas",
        "clupa_overlays": "clupa_overlays",
        "roads": "roads",
        "trails": "trails",
        "water_features": "water_features"
    }
    
    table_name = valid_tables.get(layer_name)
    if not table_name:
        raise HTTPException(status_code=400, detail=f"Invalid layer name. Must be one of {list(valid_tables.keys())}")
    
    # Safety clamp
    limit = min(limit, 5000)
        
    sql = text(f"""
        SELECT jsonb_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(jsonb_agg(f.feature), '[]'::jsonb),
            'properties', jsonb_build_object(
                'limit', :limit,
                'offset', :offset,
                'note', 'GeoJSON is truncated for performance. Use /mvt for full dataset mapping.'
            )
        )
        FROM (
            SELECT jsonb_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(ST_Transform(geom_projected, 4326))::jsonb,
                'properties', jsonb_build_object(
                    'id', id,
                    'layer', :layer_name
                )
            ) AS feature
            FROM {table_name}
            LIMIT :limit OFFSET :offset
        ) f;
    """)
    
    result = db.execute(sql, {"layer_name": layer_name, "limit": limit, "offset": offset}).scalar()
    return result if result else {"type": "FeatureCollection", "features": []}

from fastapi import Response

@router.get("/mvt/{layer_name}/{z}/{x}/{y}")
def get_mvt_tile(layer_name: str, z: int, x: int, y: int, db: Session = Depends(get_db)):
    """
    Returns binary Mapbox Vector Tiles (MVT) for the specified layer and tile coordinates.
    This is the production-grade way to serve 10,000+ polygons.
    """
    valid_tables = {
        "candidates": "candidate_units",
        "clupa_polygons": "clupa_polygons",
        "protected_areas": "protected_areas",
        "clupa_overlays": "clupa_overlays",
        "roads": "roads",
        "trails": "trails",
        "water_features": "water_features"
    }
    
    table_name = valid_tables.get(layer_name)
    if not table_name:
        raise HTTPException(status_code=400, detail="Invalid layer name")

    # SQL definition for MVT generation in PostGIS
    # We restrict candidates to the top 5000 nearest to the GTA for performance and relevance.
    sql = text(f"""
        WITH 
        bounds AS (
          SELECT ST_TileEnvelope(:z, :x, :y) AS geom
        ),
        target_candidates AS (
          SELECT id 
          FROM candidate_units 
          ORDER BY centroid <-> ST_Transform(ST_SetSRID(ST_MakePoint(-79.38, 43.65), 4326), 3161)
          LIMIT 5000
        ),
        mvt_geom AS (
          SELECT 
            ST_AsMVTGeom(ST_Transform(t.geom_projected, 3857), bounds.geom) AS geom,
            t.id
            {", cs.open_land_score, cs.terrain_enclosure_score, cs.classification" if layer_name == "candidates" else ""}
            {", t.designation_eng, t.policy_ident, t.category_eng, t.area_name" if layer_name == "clupa_polygons" else ""}
          FROM {table_name} t
          {"LEFT JOIN candidate_scores cs ON t.id = cs.candidate_unit_id" if layer_name == "candidates" else ""}
          {"JOIN target_candidates tc ON t.id = tc.id" if layer_name == "candidates" else ""}
          JOIN bounds ON ST_Intersects(ST_Transform(t.geom_projected, 3857), bounds.geom)
        )
        SELECT ST_AsMVT(mvt_geom.*, :layer_name) FROM mvt_geom;
    """)
    
    result = db.execute(sql, {"z": z, "x": x, "y": y, "layer_name": layer_name}).scalar()
    
    return Response(content=bytes(result) if result else b"", media_type="application/x-protobuf")
