"""
Geospatial layer API: candidate units, base layers (CLUPA, roads, etc.), and MVT tiles.

GeoJSON endpoints are limited for performance; use /mvt for large datasets.
"""
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
    # Allow pagination through all Ontario candidates; cap per-request size for GeoJSON safety
    limit = min(limit, 200_000)
    
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
            cs.classification,
            cp.policy_ident,
            cp.designation_eng,
            cp.category_eng,
            cp.area_name
        FROM candidate_units cu
        LEFT JOIN candidate_scores cs ON cu.id = cs.candidate_unit_id
        LEFT JOIN clupa_polygons cp ON cu.parent_clupa_id = cp.id
        ORDER BY cu.centroid <-> ST_Transform(ST_SetSRID(ST_MakePoint(-79.38, 43.65), 4326), 3161)
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
                "classification": row.classification,
                "centroid_lat": row.lat,
                "centroid_lng": row.lng,
                "policy_ident": row.policy_ident,
                "designation_eng": row.designation_eng,
                "category_eng": row.category_eng,
                "area_name": row.area_name
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
    
    limit = min(limit, 100_000)
        
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

    # MVT: all candidates (or other layers) that intersect the tile—no cap.
    if layer_name == "candidates":
        sql = text("""
        WITH bounds AS (
          SELECT ST_TileEnvelope(:z, :x, :y) AS geom
        ),
        mvt_geom AS (
          SELECT 
            ST_AsMVTGeom(ST_Transform(t.geom_projected, 3857), bounds.geom) AS geom,
            t.id,
            cs.open_land_score,
            cs.terrain_enclosure_score,
            cs.classification,
            cp.policy_ident,
            cp.designation_eng,
            cp.category_eng,
            cp.area_name,
            ST_Y(ST_Transform(t.centroid, 4326)) AS centroid_lat,
            ST_X(ST_Transform(t.centroid, 4326)) AS centroid_lng
          FROM candidate_units t
          LEFT JOIN candidate_scores cs ON t.id = cs.candidate_unit_id
          LEFT JOIN clupa_polygons cp ON t.parent_clupa_id = cp.id
          CROSS JOIN bounds
          WHERE ST_Intersects(ST_Transform(t.geom_projected, 3857), bounds.geom)
        )
        SELECT ST_AsMVT(mvt_geom.*, :layer_name) FROM mvt_geom;
        """)
    else:
        sql = text(f"""
        WITH bounds AS (
          SELECT ST_TileEnvelope(:z, :x, :y) AS geom
        ),
        mvt_geom AS (
          SELECT 
            ST_AsMVTGeom(ST_Transform(t.geom_projected, 3857), bounds.geom) AS geom,
            t.id
            {", t.designation_eng, t.policy_ident, t.category_eng, t.area_name" if layer_name == "clupa_polygons" else ""}
          FROM {table_name} t
          CROSS JOIN bounds
          WHERE ST_Intersects(ST_Transform(t.geom_projected, 3857), bounds.geom)
        )
        SELECT ST_AsMVT(mvt_geom.*, :layer_name) FROM mvt_geom;
        """)
    
    result = db.execute(sql, {"z": z, "x": x, "y": y, "layer_name": layer_name}).scalar()
    
    return Response(content=bytes(result) if result else b"", media_type="application/x-protobuf")
