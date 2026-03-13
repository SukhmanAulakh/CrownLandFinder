import os
import logging
from pathlib import Path
from sqlalchemy import create_engine
import geopandas as gpd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_USER = os.getenv("POSTGRES_USER", "crownland")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "crownland")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("POSTGRES_DB", "crownland_db")
DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}"

PROJ_SRID = 3161

def load_dem_tiles(index_geojson: str):
    if not os.path.exists(index_geojson):
        logger.error(f"File not found: {index_geojson}")
        return

    logger.info("Loading DEM tile index to database...")
    try:
        import warnings
        warnings.filterwarnings('ignore', 'GeoSeries.notna', UserWarning)
        
        gdf = gpd.read_file(index_geojson)
        if len(gdf) == 0:
            logger.info("No features in DEM index to load.")
            return
            
        if gdf.crs is None:
            gdf.set_crs(epsg=4269, inplace=True)
            
        gdf['bbox'] = gdf.geometry.to_crs(epsg=PROJ_SRID)
        
        engine = create_engine(DB_URL)
        gdf.to_postgis("dem_tiles", engine, if_exists='append', index=False, geometry_name='bbox')
        logger.info(f"Successfully loaded {len(gdf)} tiles index to dem_tiles")
    except Exception as e:
        logger.error(f"Failed to load {index_geojson}: {e}")

if __name__ == "__main__":
    RAW_DIR = Path(__file__).parent.parent / "raw"
    load_dem_tiles(str(RAW_DIR / "dem_tile_index.geojson"))
