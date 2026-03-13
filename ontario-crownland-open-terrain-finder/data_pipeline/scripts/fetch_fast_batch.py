import os
import requests
import json
import time
import logging
from pathlib import Path
from arcgis2geojson import arcgis2geojson

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RAW_DIR = Path(__file__).parent.parent / "raw"
PAGE_SIZE = 2000 # Max for most ESRI servers

def fetch_fast(rest_url, output_key):
    logger.info(f"--- Fast Loading {output_key} ---")
    all_features = []
    offset = 0
    
    while True:
        params = {
            "where": "1=1",
            "outFields": "*",
            "f": "json",
            "returnGeometry": "true",
            "resultOffset": offset,
            "resultRecordCount": PAGE_SIZE
        }
        
        try:
            res = requests.get(f"{rest_url}/query", params=params, timeout=60)
            data = res.json()
            
            features = data.get("features", [])
            if not features:
                break
                
            for f in features:
                f["geometry"]["spatialReference"] = {"wkid": 4269}
                try:
                    all_features.append(arcgis2geojson(f))
                except:
                    pass
            
            logger.info(f"  Fetched {len(all_features)} features...")
            if len(features) < PAGE_SIZE:
                break
                
            offset += PAGE_SIZE
            time.sleep(0.5)
            
        except Exception as e:
            logger.error(f"Error at offset {offset}: {e}")
            break

    if all_features:
        out_path = RAW_DIR / f"{output_key}.geojson"
        final_geojson = {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "EPSG:4269"}},
            "features": all_features,
        }
        with open(out_path, "w") as f:
            json.dump(final_geojson, f)
        logger.info(f"Saved {len(all_features)} features to {out_path}")

if __name__ == "__main__":
    layers = [
        ("https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open06/MapServer/4", "clupa_overlay"),
        ("https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open03/MapServer/4", "provincial_parks"),
        ("https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open03/MapServer/2", "conservation_reserves"),
        ("https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open03/MapServer/14", "municipal_boundaries")
    ]
    
    for url, key in layers:
        fetch_fast(url, key)
