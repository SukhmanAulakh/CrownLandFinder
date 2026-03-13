import os
import requests
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RAW_DIR = Path(__file__).parent.parent / "raw"

def fetch_access_points():
    rest_url = "https://ws.lioservices.lrc.gov.on.ca/arcgis1061a/rest/services/LIO_OPEN_DATA/LIO_Open_Data_Non_Tiled/MapServer/5" # Example ID for fishing access points
    logger.info("Fetching access points...")
    os.makedirs(RAW_DIR, exist_ok=True)
    out_path = RAW_DIR / "access_points.geojson"
    
    params = {"where": "1=1", "outFields": "*", "outSR": "4269", "f": "geojson"}
    try:
        with requests.get(f"{rest_url}/query", params=params, stream=True, timeout=300) as r:
            r.raise_for_status()
            with open(out_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192): 
                    f.write(chunk)
        logger.info(f"Successfully saved {out_path}")
    except Exception as e:
        logger.error(f"Failed to fetch access points: {e}")

if __name__ == "__main__":
    fetch_access_points()
