import os
import ijson
import json
from sqlalchemy import create_engine, insert, text
from sqlalchemy.orm import sessionmaker
from geoalchemy2.elements import WKTElement
import logging
import sys
from shapely.geometry import shape, MultiPolygon
from pyproj import Transformer

# Ensure backend modules can be imported
sys.path.insert(0, "/app")
from app.db.models.spatial import ClupaPolygon

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_USER = os.getenv("POSTGRES_USER", "crownland")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "crownland")
DB_HOST = os.getenv("DB_HOST", "db")
DB_NAME = os.getenv("POSTGRES_DB", "crownland_db")
DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}"

GEOJSON_PATH = "/data_pipeline/raw/crown_land_2025.geojson"
PROJ_SRID = 3161
RAW_SRID = 4269

def stream_load():
    print("Function stream_load started")
    engine = create_engine(DB_URL)
    
    # Get Source ID
    with engine.begin() as conn:
        logger.info("Initializing Data Source...")
        res = conn.execute(text("SELECT id FROM data_sources WHERE name = 'Ontario LIO'")).fetchone()
        if not res:
            conn.execute(text("INSERT INTO data_sources (name, provider) VALUES ('Ontario LIO', 'Ontario Government')"))
            res = conn.execute(text("SELECT id FROM data_sources WHERE name = 'Ontario LIO'")).fetchone()
        source_id = res[0]
        
        logger.info("Truncating clupa_polygons...")
        conn.execute(text("DELETE FROM clupa_polygons;"))
    
    logger.info(f"Starting streaming load of {GEOJSON_PATH}...")
    
    transformer = Transformer.from_crs("epsg:4269", "epsg:3161", always_xy=True)
    
    batch = []
    count = 0
    batch_size = 1000
    
    with open(GEOJSON_PATH, 'rb') as f:
        logger.info("File opened, iterating features...")
        features = ijson.items(f, 'features.item')
        for feature in features:
            if count % 100 == 0:
                logger.info(f"Processing feature {count}...")
            props = feature.get('properties', {})
            geom_dict = feature.get('geometry')
            
            if not geom_dict:
                continue
                
            try:
                # Parse geometry via shapely
                poly = shape(geom_dict)
                
                # Ensure MultiPolygon for schema compliance
                if poly.geom_type == 'Polygon':
                    poly = MultiPolygon([poly])
                elif poly.geom_type != 'MultiPolygon':
                    continue # Skip points/lines if any
                
                wkt_raw = poly.wkt
                
                # Project
                from shapely.ops import transform
                poly_proj = transform(transformer.transform, poly)
                wkt_proj = poly_proj.wkt
                
                row = {
                    "external_id": str(props.get('OBJECTID', props.get('OGF_ID'))),
                    "policy_ident": props.get('POLICY_IDE'),
                    "area_name": props.get('NAME_ENG'),
                    "designation_eng": props.get('DESIGNATIO'),
                    "category_eng": props.get('CATEGORY_E'),
                    "geom_raw": WKTElement(wkt_raw, srid=RAW_SRID),
                    "geom_projected": WKTElement(wkt_proj, srid=PROJ_SRID),
                    "source_id": source_id
                }
                
                batch.append(row)
                count += 1
                
                if len(batch) >= batch_size:
                    with engine.begin() as conn:
                        conn.execute(insert(ClupaPolygon).values(batch))
                    logger.info(f"Inserted {count} features...")
                    batch = []
                    
            except Exception as e:
                logger.error(f"Error processing feature {count}: {e}")
                continue
                
        # Final batch
        if batch:
            with engine.begin() as conn:
                conn.execute(insert(ClupaPolygon).values(batch))
            logger.info(f"Final batch inserted. Total: {count}")

if __name__ == "__main__":
    stream_load()
