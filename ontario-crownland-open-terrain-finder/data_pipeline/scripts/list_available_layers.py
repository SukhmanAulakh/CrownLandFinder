import requests
import json

urls = [
    "https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open06/MapServer",
    "https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open03/MapServer",
    "https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open09/MapServer",
    "https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open04/MapServer",
    "https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open01/MapServer"
]

with open("/data_pipeline/raw/available_layers.txt", "w") as out:
    for url in urls:
        try:
            data = requests.get(f"{url}?f=json").json()
            out.write(f"\n--- {url} ---\n")
            for l in data.get('layers', []):
                out.write(f"{l['id']}: {l['name']}\n")
        except Exception as e:
            out.write(f"Error fetching {url}: {e}\n")
print("Done. Output written to /data_pipeline/raw/available_layers.txt")
