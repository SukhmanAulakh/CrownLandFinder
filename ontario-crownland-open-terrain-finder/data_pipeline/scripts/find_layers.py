import requests

SERVICES = [f"LIO_OPEN_DATA/LIO_Open{str(i).zfill(2)}" for i in range(1, 11)]
BASE_URL = "https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services"

TARGETS = {
    "clupa_provincial": "CLUPA Provincial",
    "clupa_overlay": "CLUPA Overlay",
    "provincial_parks": "Provincial Park Regulated",
    "conservation_reserves": "Conservation Reserve Regulated",
    "roads": "Ontario Road Network (ORN) Segment",
    "trails": "Ontario Trail Network (OTN) Segment",
    "waterbodies": "Ontario Hydro Network (OHN) - Waterbody",
    "municipal_boundaries": "Municipal Boundary - Lower and Single Tier"
}

found = {}

for service in SERVICES:
    url = f"{BASE_URL}/{service}/MapServer?f=json"
    try:
        res = requests.get(url, timeout=10)
        data = res.json()
        layers = data.get("layers", [])
        for layer in layers:
            for key, name in TARGETS.items():
                if name.lower() in layer["name"].lower():
                    found[key] = f"{BASE_URL}/{service}/MapServer/{layer['id']}"
                    print(f"FOUND {key}: {found[key]} ({layer['name']})")
    except Exception as e:
        print(f"Error checking {service}: {e}")

print("\n--- FINAL MAPPING ---")
for k, v in found.items():
    print(f"{k}: {v}")
