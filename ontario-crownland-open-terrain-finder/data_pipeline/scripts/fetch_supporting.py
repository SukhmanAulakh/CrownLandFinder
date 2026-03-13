import os
import requests
import yaml
import json
import time
import logging
from pathlib import Path
from arcgis2geojson import arcgis2geojson

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RAW_DIR = Path(__file__).parent.parent / "raw"
CONFIG_FILE = Path(__file__).parent.parent / "configs" / "datasets.yaml"

# Reduced Bounding Box for faster fetch if possible, but let's stick to full Ontario for correctness
# Full Ontario bounding box (WGS84 / EPSG:4326)
ONTARIO_BBOX = (-95.2, 41.7, -74.3, 56.9)
GRID_STEP = 2.0 # Larger grid for faster lookup in smaller datasets
PAGE_SIZE = 1000

def fetch_rest_layer_simple(layer_config, output_key):
    rest_url = layer_config.get("rest_url")
    if not rest_url:
        return

    output_filename = f"{output_key}.geojson"
    logger.info(f"--- Fetching {output_key} ---")
    os.makedirs(RAW_DIR, exist_ok=True)
    out_path = RAW_DIR / output_filename
    
    all_features = []
    seen_ids = set()

    # Try a single global query first, most of these are small
    params = {
        "where": "1=1",
        "outFields": "*",
        "f": "json",
        "returnGeometry": "true"
    }
    
    try:
        res = requests.get(f"{rest_url}/query", params=params, timeout=60)
        data = res.json()
        
        if "features" in data:
            features = data["features"]
            for f in features:
                f["geometry"]["spatialReference"] = {"wkid": 4269}
                all_features.append(arcgis2geojson(f))
            
            logger.info(f"Fetched {len(all_features)} features for {output_key} via simple query.")
        else:
            logger.warning(f"Simple query failed for {output_key}, falling back to grid (partial).")
            # For simplicity, if simple fails, we skip for now or use the adaptive one
            
    except Exception as e:
        logger.error(f"Error fetching {output_key}: {e}")

    if all_features:
        final_geojson = {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "EPSG:4269"}},
            "features": all_features,
        }
        with open(out_path, "w") as f:
            json.dump(final_geojson, f)

if __name__ == "__main__":
    with open(CONFIG_FILE, "r") as f:
        datasets = yaml.safe_load(f)["datasets"]

    # Target layers
    layers = [
        "clupa_overlay",
        "provincial_parks",
        "conservation_reserves",
        "municipal_boundaries",
        "roads",
        "trails",
        "waterbodies"
    ]
    
    for key in layers:
        fetch_rest_layer_simple(datasets.get(key, {}), key)
