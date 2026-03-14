import json
import os

GEOJSON_PATH = "../raw/roads.geojson"

def inspect_schema():
    if not os.path.exists(GEOJSON_PATH):
        print(f"File not found: {GEOJSON_PATH}")
        return

    print(f"Inspecting keys of {GEOJSON_PATH}...\n")
    
    with open(GEOJSON_PATH, 'r') as f:
        data = json.load(f)
        features = data.get('features', [])
        if not features:
            print("No features found.")
            return

        # Print all keys from the first feature
        first_props = features[0].get('properties', {})
        print("\n--- All Property Keys (First Feature) ---")
        print(sorted(list(first_props.keys())))

        # Look for features with any name-like data
        name_fields = ['OFFICIAL_NAME', 'STREET_NAME', 'STREET_NAME_FULL', 'STREET_NAME_PREFIX', 'NAME', 'LABEL', 'ROAD_NAME']
        
        found_sample = False
        print("\n--- Searching for Named Features ---")
        for i, feat in enumerate(features[:500]): # Search first 500
            props = feat.get('properties', {})
            # Check if any field contains 'Rd' or any name fields are non-null
            has_name = any(str(props.get(k, '')).strip() != '' for k in props.keys() if any(x in k.upper() for x in ['NAME', 'OFFICIAL', 'STREET', 'LABEL']))
            
            if has_name:
                print(f"Found named feature at index {i}:")
                for k, v in props.items():
                    if v and str(v).strip() != '':
                        print(f"  {k}: {v}")
                found_sample = True
                if i > 5: # Get a few samples
                    break
        
        if not found_sample:
            print("Could not find any features with non-empty 'NAME' or 'OFFICIAL' properties in the first 500.")

if __name__ == "__main__":
    inspect_schema()
