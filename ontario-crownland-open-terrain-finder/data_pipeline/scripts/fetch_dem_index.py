import os
import requests
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RAW_DIR = Path(__file__).parent.parent / "raw"

def fetch_dem_index():
    # Ontario GeoHub / GEO.ca exposed Lidar/DEM indexes
    # Here we simulate fetching the tile index.
    # In reality, this would query a REST endpoint or download a massive GeoJSON of tile bboxes.
    logger.info("Fetching PDEM / Lidar tile index...")
    os.makedirs(RAW_DIR, exist_ok=True)
    out_path = RAW_DIR / "dem_tile_index.geojson"
    
    # Using a fake URL for stub
    url = "https://example.com/ontario-dem-index.geojson"
    try:
        # response = requests.get(url, timeout=60)
        # with open(out_path, 'w') as f:
        #     f.write(response.text)
        
        # Stub the file
        with open(out_path, 'w') as f:
            f.write('{"type":"FeatureCollection","features":[]}')
        logger.info(f"Saved DEM index stub to {out_path}")
    except Exception as e:
        logger.error(f"Failed to fetch DEM index: {e}")

if __name__ == "__main__":
    fetch_dem_index()
