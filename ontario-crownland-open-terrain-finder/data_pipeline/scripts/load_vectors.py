import os
import geopandas as gpd
from sqlalchemy import create_engine
import logging
from pathlib import Path
import yaml
import sys

# Ensure backend modules can be imported inside Docker
sys.path.insert(0, "/app")
from app.db.models.spatial import ClupaPolygon, ClupaOverlay, ProtectedArea, MunicipalBoundary, Road, Trail, WaterFeature

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RAW_DIR = Path(__file__).parent.parent / "raw"
CONFIG_FILE = Path(__file__).parent.parent / "configs" / "datasets.yaml"

DB_USER = os.getenv("POSTGRES_USER", "crownland")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "crownland")
DB_HOST = os.getenv("DB_HOST", "db")
DB_NAME = os.getenv("POSTGRES_DB", "crownland_db")
DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}"

PROJ_SRID = 3161

def map_and_load(geojson_path: str, model_class, config_block: dict):
    if not os.path.exists(geojson_path):
        logger.warning(f"File not found, skipping: {geojson_path}")
        return

    target_table = model_class.__tablename__
    logger.info(f"Loading {geojson_path} into {target_table}...")
    
    try:
        import warnings
        from shapely.errors import ShapelyDeprecationWarning
        warnings.filterwarnings('ignore', category=UserWarning)
        warnings.filterwarnings('ignore', category=ShapelyDeprecationWarning)
        
        gdf = gpd.read_file(geojson_path)
        if gdf.empty:
            logger.warning(f"GeoJSON {geojson_path} is empty.")
            return

        # Handle CRSs
        if gdf.crs is None:
            gdf.set_crs(epsg=4269, inplace=True)
            
        # Standardize column names to lowercase to map easier
        gdf.columns = [c.lower() for c in gdf.columns]
        
        # Prepare geometry columns explicitly named for exact SQLAlchemy mappings
        # The schema requires `geom_raw` (4269) and `geom_projected` (3161)
        gdf['geom_raw'] = gdf.geometry.apply(lambda geom: geom.wkt if geom else None)
        
        projected_gdf = gdf.to_crs(epsg=PROJ_SRID)
        gdf['geom_projected'] = projected_gdf.geometry.apply(lambda geom: geom.wkt if geom else None)
        
        # Inject source_id
        gdf['source_id_internal'] = LIO_SOURCE_ID

        # Extract model columns to filter out extraneous GeoJSON properties
        model_columns = [c.name for c in model_class.__table__.columns]
        
        # Map specific ESRI fields to our schema fields
        field_mapping = {
            # General
            "objectid": "external_id",
            "source_id_internal": "source_id",
            # CLUPA
            "policy_ident": "policy_ident",
            "policy_ide": "policy_ident", # Lantern Search
            "english_name": "area_name", 
            "name_eng": "area_name", # Lantern Search
            "designation_primary_class": "designation_eng",
            "designatio": "designation_eng", # Lantern Search
            "primary_land_use": "category_eng",
            "category_e": "category_eng", # Lantern Search
            # Protected Areas
            "official_name": "name",
            "protected_area_class": "protected_type",
            # Roads
            "road_class": "road_class",
            "surface_type": "surface_type",
            "street_name": "name",
            # Trails
            "trail_name": "name",
            "trail_type": "trail_type",
            "permitted_uses": "permitted_uses",
            # Hydro
            "waterbody_type": "waterbody_type",
            "official_name_label": "name"
        }
        
        # Rename columns to match database schema
        rename_dict = {k: v for k, v in field_mapping.items() if k in gdf.columns}
        gdf.rename(columns=rename_dict, inplace=True)
        
        # Drop `geometry` since GeoAlchemy wants `geom_raw` and `geom_projected` via WKT
        if 'geometry' in gdf.columns:
            gdf = gdf.drop(columns=['geometry'])
            
        # Ensure we only attempt to insert columns that actually exist in the table
        insert_cols = [c for c in model_columns if c in gdf.columns]
        out_df = gdf[insert_cols]
        
        # Pure SQLAlchemy mapping for exact schema enforcement
        from sqlalchemy.orm import Session
        from geoalchemy2.elements import WKTElement
        from getpass import getuser
        
        objects = []
        for idx, row in out_df.iterrows():
            # Build dictionary for the model
            row_dict = row.to_dict()
            
            # Convert NaN to None for SQL null insertion
            import numpy as np
            row_dict = {k: (None if (isinstance(v, float) and np.isnan(v)) else v) for k, v in row_dict.items()}
            
            # Wrap geometries in GeoAlchemy's WKTElement so it inserts correctly into PostGIS
            if row_dict.get('geom_raw'):
                row_dict['geom_raw'] = WKTElement(row_dict['geom_raw'], srid=4269)
            if row_dict.get('geom_projected'):
                row_dict['geom_projected'] = WKTElement(row_dict['geom_projected'], srid=PROJ_SRID)
                
            objects.append(row_dict)
            
        # Bulk Insert via SQLAlchemy Core to handle the WKTElements properly
        from sqlalchemy import insert
        
        with engine.begin() as conn:
            # We insert in chunks to avoid blowing up memory on huge datasets
            chunk_size = 5000
            for i in range(0, len(objects), chunk_size):
                chunk = objects[i:i + chunk_size]
                conn.execute(insert(model_class).values(chunk))
                
        logger.info(f"Successfully loaded {len(objects)} rows to {target_table}")
        
    except Exception as e:
        logger.error(f"Failed to load {geojson_path}: {e}")

if __name__ == "__main__":
    with open(CONFIG_FILE, 'r') as f:
        datasets = yaml.safe_load(f)["datasets"]
        
    engine = create_engine(DB_URL)
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        # Ensure 'data_sources' has at least one record
        res = conn.execute(text("SELECT id FROM data_sources WHERE name = 'Ontario LIO'")).fetchone()
        if not res:
            conn.execute(text("INSERT INTO data_sources (name, provider) VALUES ('Ontario LIO', 'Ontario Government')"))
            res = conn.execute(text("SELECT id FROM data_sources WHERE name = 'Ontario LIO'")).fetchone()
        LIO_SOURCE_ID = res[0]
    
    # Pre-inject source_id into global scope for loader if needed, or modify map_and_load
    # For simplicity, I'll update map_and_load to accept it or just hardcode it in the mapping
    
    # Mapping definitions
    mapping = [
        # ("crown_land_2025.geojson", ClupaPolygon, "clupa_provincial"),
        # ("clupa_provincial.geojson", ClupaPolygon, "clupa_provincial"),
        ("clupa_overlay.geojson", ClupaOverlay, "clupa_overlay"),
        ("clupa_overlay.geojson", ClupaOverlay, "clupa_overlay"),
        ("provincial_parks.geojson", ProtectedArea, "provincial_parks"),
        ("conservation_reserves.geojson", ProtectedArea, "conservation_reserves"),
        ("municipal_boundaries.geojson", MunicipalBoundary, "municipal_boundaries"),
        ("roads.geojson", Road, "roads"),
        ("trails.geojson", Trail, "trails"),
        ("waterbodies.geojson", WaterFeature, "waterbodies")
    ]
    
    for filename, model, config_key in mapping:
        map_and_load(RAW_DIR / filename, model, datasets.get(config_key, {}))
