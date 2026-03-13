import requests
import json

URL = "https://ws.lioservices.lrc.gov.on.ca/arcgis1061a/rest/services/LIO_OPEN_DATA/LIO_Open_Data_Non_Tiled/MapServer/39/query"

# Test 1: Simple OBJECTID query (No geometry)
print("--- Test 1: OBJECTID < 5 ---")
params = {
    "where": "OBJECTID < 5",
    "f": "json",
    "outFields": "OBJECTID,POLICY_IDENT"
}
res = requests.get(URL, params=params)
print(f"Status: {res.status_code}")
data = res.json()
features = data.get("features", [])
print(f"Features found: {len(features)}")
if features:
    print(f"Sample attribute: {features[0]['attributes']}")

# Test 2: Geometry query (Sudbury area)
print("\n--- Test 2: Geometry Query (Sudbury) ---")
geom_json = json.dumps({
    "xmin": -81.2, "ymin": 46.2, "xmax": -80.8, "ymax": 46.6,
    "spatialReference": {"wkid": 4326}
})
params = {
    "where": "1=1",
    "geometry": geom_json,
    "geometryType": "esriGeometryEnvelope",
    "spatialRel": "esriSpatialRelIntersects",
    "f": "json",
    "outFields": "OBJECTID,POLICY_IDENT"
}
res = requests.get(URL, params=params)
print(f"Status: {res.status_code}")
data = res.json()
if "error" in data:
    print(f"Error: {data['error'].get('message')}")
else:
    features = data.get("features", [])
    print(f"Features found: {len(features)}")

# Test 3: Count query
print("\n--- Test 3: Count Only ---")
params["returnCountOnly"] = "true"
res = requests.get(URL, params=params)
print(f"Count result: {res.json()}")
