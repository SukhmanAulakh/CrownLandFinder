import os
import requests
import yaml
import json
import time
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RAW_DIR = Path(__file__).parent.parent / "raw"
CONFIG_FILE = Path(__file__).parent.parent / "configs" / "datasets.yaml"

# Full Ontario bounding box (WGS84 / EPSG:4326)
ONTARIO_BBOX = (-95.2, 41.7, -74.3, 56.9)

# Grid step size in degrees for initial tiling
GRID_STEP = 1.0

# Max features per request
PAGE_SIZE = 1000

def fetch_tile(rest_url, x, y, x2, y2, seen_ids, all_features):
    """Recursively fetches a tile, subdividing if the server errors."""
    from arcgis2geojson import arcgis2geojson

    # Paginate within this tile
    offset = 0
    tile_features = []
    
    while True:
        geom_json = json.dumps({
            "xmin": x, "ymin": y, "xmax": x2, "ymax": y2,
            "spatialReference": {"wkid": 4326}
        })
        params = {
            "where": "1=1",
            "geometry": geom_json,
            "geometryType": "esriGeometryEnvelope",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "*",
            "returnGeometry": "true",
            "resultOffset": offset,
            "resultRecordCount": PAGE_SIZE,
            "f": "json",
        }

        try:
            res = requests.get(f"{rest_url}/query", params=params, timeout=60)
            res.raise_for_status()
            data = res.json()
        except Exception as req_err:
            logger.warning(f"Request failed for tile ({x:.2f},{y:.2f}) offset {offset}: {req_err}")
            return False # Trigger subdivision

        if "error" in data:
            # ArcGIS Server Error often means the query is too complex for the given tile
            msg = data['error'].get('message', 'Unknown Error')
            logger.warning(f"ArcGIS Error on tile ({x:.2f},{y:.2f}): {msg}. Subdividing...")
            return False # Trigger subdivision

        features = data.get("features", [])
        if not features:
            break

        for feature in features:
            feat_id = (
                feature.get("attributes", {}).get("OBJECTID")
                or feature.get("attributes", {}).get("GLOBALID")
                or str(feature.get("attributes", {}))
            )
            if feat_id not in seen_ids:
                seen_ids.add(feat_id)
                if "geometry" in feature and feature["geometry"]:
                    feature["geometry"]["spatialReference"] = {"wkid": 4269}
                    try:
                        all_features.append(arcgis2geojson(feature))
                        tile_features.append(feat_id)
                    except Exception as conv_err:
                        pass

        if len(features) < PAGE_SIZE:
            break

        offset += PAGE_SIZE
        time.sleep(0.1)
    
    return True

def fetch_tile_recursive(rest_url, x, y, x2, y2, seen_ids, all_features, depth=0):
    """Attempts to fetch a tile, subdividing into 4 quadrants if it fails."""
    if depth > 4: # Safety limit
        logger.error(f"Max recursion depth reached for tile ({x},{y}). Skipping.")
        return

    success = fetch_tile(rest_url, x, y, x2, y2, seen_ids, all_features)
    
    if not success:
        logger.info(f"Subdividing tile at depth {depth}: ({x:.2f}, {y:.2f}) to ({x2:.2f}, {y2:.2f})")
        mid_x = (x + x2) / 2
        mid_y = (y + y2) / 2
        
        # Quadrants: [SW, SE, NW, NE]
        quads = [
            (x, y, mid_x, mid_y),
            (mid_x, y, x2, mid_y),
            (x, mid_y, mid_x, y2),
            (mid_x, mid_y, x2, y2)
        ]
        
        for qx, qy, qx2, qy2 in quads:
            fetch_tile_recursive(rest_url, qx, qy, qx2, qy2, seen_ids, all_features, depth + 1)

def fetch_rest_layer(layer_config: dict, output_key: str):
    rest_url = layer_config.get("rest_url")
    if not rest_url:
        logger.error(f"No REST URL configured for {output_key}")
        return

    output_filename = f"{output_key}.geojson"
    logger.info(f"--- Fetching {output_key} from {rest_url} (Adaptive Tiling) ---")
    os.makedirs(RAW_DIR, exist_ok=True)
    out_path = RAW_DIR / output_filename

    try:
        all_features = []
        seen_ids = set()

        x_start, x_end = ONTARIO_BBOX[0], ONTARIO_BBOX[2]
        y_start, y_end = ONTARIO_BBOX[1], ONTARIO_BBOX[3]

        x = x_start
        while x < x_end:
            x2 = min(x + GRID_STEP, x_end)
            y = y_start
            while y < y_end:
                y2 = min(y + GRID_STEP, y_end)
                
                fetch_tile_recursive(rest_url, x, y, x2, y2, seen_ids, all_features)
                
                y += GRID_STEP

            logger.info(f"  Lon {x:.1f} band done. Total features: {len(all_features)}")
            x += GRID_STEP
            time.sleep(0.5)

        final_geojson = {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "EPSG:4269"}},
            "features": all_features,
        }

        with open(out_path, "w") as f:
            json.dump(final_geojson, f)

        logger.info(f"Successfully saved {len(all_features)} unique features into {output_filename}")

    except Exception as e:
        logger.error(f"Failed to fetch {output_filename}: {e}", exc_info=True)

if __name__ == "__main__":
    with open(CONFIG_FILE, "r") as f:
        datasets = yaml.safe_load(f)["datasets"]

    # Target the essential layers we missed.
    # We skip clupa_provincial because we used Lantern Search for it.
    target_layers = [
        "clupa_overlay",
        "provincial_parks",
        "conservation_reserves",
        "municipal_boundaries"
    ]
    
    for key in target_layers:
        if key in datasets:
            fetch_rest_layer(datasets[key], key)
        else:
            logger.warning(f"Layer {key} not found in config.")
