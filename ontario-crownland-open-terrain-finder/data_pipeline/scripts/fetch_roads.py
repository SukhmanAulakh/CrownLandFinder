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
PAGE_SIZE = 2000

def fetch_roads():
    with open(CONFIG_FILE, 'r') as f:
        config = yaml.safe_load(f)["datasets"]
        
    layer_config = config.get("roads")
    if not layer_config: return
    
    rest_url = layer_config.get("rest_url")
    logger.info("--- Starting GTA-Optimized Road Fetch (MNRF Layer 18) ---")
    os.makedirs(RAW_DIR, exist_ok=True)
    out_path = RAW_DIR / "roads.geojson"
    
    all_features = []
    
    # Define zones to fetch, explicitly excluding the GTA corridor
    # Ontario BBox roughly: -95.2, 41.7, -74.3, 56.9
    zones = [
        {"name": "Northern Ontario (North of 44.5)", "bbox": "-95.2,44.5,-74.3,56.9"},
        {"name": "Southwest Ontario (West of -80.5)", "bbox": "-95.2,41.7,-80.5,44.5"},
        {"name": "Southeast Ontario (East of -78.5)", "bbox": "-78.5,41.7,-74.3,44.5"}
    ]
    
    for zone in zones:
        logger.info(f"Processing Zone: {zone['name']}")
        offset = 0
        
        while True:
            params = {
                "where": "1=1", 
                "outFields": "*", 
                "outSR": "4269", 
                "f": "json",
                "returnGeometry": "true",
                "geometry": zone["bbox"],
                "geometryType": "esriGeometryEnvelope",
                "inSR": "4269",
                "spatialRel": "esriSpatialRelIntersects",
                "resultOffset": offset,
                "resultRecordCount": PAGE_SIZE
            }
            
            try:
                # logger.info(f"  Fetching offset {offset}...")
                res = requests.get(f"{rest_url}/query", params=params, timeout=120)
                res.raise_for_status()
                data = res.json()
                
                features = data.get("features", [])
                if not features:
                    break
                    
                for f in features:
                    if "geometry" in f:
                        f["geometry"]["spatialReference"] = {"wkid": 4269}
                    try:
                        all_features.append(arcgis2geojson(f))
                    except:
                        pass
                
                logger.info(f"    Added {len(features)} features (Zone: {zone['name']}, Total: {len(all_features)})")
                
                if len(features) < PAGE_SIZE:
                    break
                    
                offset += PAGE_SIZE
                time.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error in zone {zone['name']} at offset {offset}: {e}")
                break

    if all_features:
        final_geojson = {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "EPSG:4269"}},
            "features": all_features,
        }
        with open(out_path, "w") as f:
            json.dump(final_geojson, f)
        logger.info(f"Successfully saved {len(all_features)} features to {out_path}")
    else:
        logger.error("No features were fetched.")

if __name__ == "__main__":
    fetch_roads()
