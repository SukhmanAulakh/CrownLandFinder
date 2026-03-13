import os
import requests
import yaml
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RAW_DIR = Path(__file__).parent.parent / "raw"
CONFIG_FILE = Path(__file__).parent.parent / "configs" / "datasets.yaml"

def fetch_roads():
    with open(CONFIG_FILE, 'r') as f:
        config = yaml.safe_load(f)["datasets"]
        
    layer_config = config.get("roads")
    if not layer_config: return
    
    rest_url = layer_config.get("rest_url")
    logger.info("Fetching Ontario Road Network...")
    os.makedirs(RAW_DIR, exist_ok=True)
    out_path = RAW_DIR / "roads.geojson"
    
    params = {"where": "1=1", "outFields": "*", "outSR": "4269", "f": "geojson"}
    try:
        with requests.get(f"{rest_url}/query", params=params, stream=True, timeout=300) as r:
            r.raise_for_status()
            with open(out_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192): 
                    f.write(chunk)
        logger.info(f"Saved {out_path}")
    except Exception as e:
        logger.error(f"Failed to fetch roads: {e}")

if __name__ == "__main__":
    fetch_roads()
