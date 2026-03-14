import os
import requests
import yaml
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RAW_DIR = Path(__file__).parent.parent / "raw"
CONFIG_FILE = Path(__file__).parent.parent / "configs" / "datasets.yaml"

def fetch_layer(config_node: dict, filename: str):
    if not config_node: return
    rest_url = config_node.get("rest_url")
    if not rest_url: return
    
    logger.info(f"Fetching {filename} (Haliburton Area)...")
    os.makedirs(RAW_DIR, exist_ok=True)
    out_path = RAW_DIR / filename
    
    # BBOX for Haliburton area to ensure local trails are captured
    bbox = "-79.0,44.5,-77.5,45.5"
    params = {
        "where": "1=1", 
        "outFields": "*", 
        "outSR": "4269", 
        "f": "geojson",
        "geometry": bbox,
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4269",
        "spatialRel": "esriSpatialRelIntersects",
        "resultRecordCount": 2000
    }
    try:
        with requests.get(f"{rest_url}/query", params=params, stream=True, timeout=300) as r:
            r.raise_for_status()
            with open(out_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192): 
                    f.write(chunk)
        logger.info(f"Saved {out_path}")
    except Exception as e:
        logger.error(f"Failed to fetch {filename}: {e}")

if __name__ == "__main__":
    with open(CONFIG_FILE, 'r') as f:
        config = yaml.safe_load(f)["datasets"]
        
    fetch_layer(config.get("trails"), "trails.geojson")
