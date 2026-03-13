import requests
import json
url = 'https://ws.lioservices.lrc.gov.on.ca/arcgis1061a/rest/services/LIO_OPEN_DATA/LIO_Open_Data_Non_Tiled/MapServer/39?f=json'
try:
    data = requests.get(url).json()
    print(f"maxRecordCount: {data.get('maxRecordCount')}")
    print(f"supportsPagination: {data.get('advancedQueryCapabilities', {}).get('supportsPagination')}")
except Exception as e:
    print(f"Error: {e}")
