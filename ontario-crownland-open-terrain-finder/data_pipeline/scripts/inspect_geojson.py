import json
import re
import os

GEOJSON_PATH = "/data_pipeline/raw/crown_land_2025.geojson"

OUTPUT_PATH = "/data_pipeline/raw/geojson_schema.txt"

def inspect_schema():
    if not os.path.exists(GEOJSON_PATH):
        print(f"File not found: {GEOJSON_PATH}")
        return

    with open(OUTPUT_PATH, 'w') as out:
        out.write(f"Inspecting keys of {GEOJSON_PATH}...\n")
        
        with open(GEOJSON_PATH, 'r') as f:
            # Read a much larger chunk to ensure we hit the first feature
            chunk = f.read(2000000)
            
            # Find the first feature start
            # Features usually start after "features": [
            features_start = chunk.find('"features":')
            if features_start != -1:
                # Find the first "properties": after features_start
                start_marker = '"properties":'
                start_idx = chunk.find(start_marker, features_start)
                
                if start_idx != -1:
                    depth = 0
                    json_str = ""
                    for i in range(start_idx + len(start_marker), len(chunk)):
                        char = chunk[i]
                        json_str += char
                        if char == '{':
                            depth += 1
                        elif char == '}':
                            depth -= 1
                            if depth == 0:
                                break
                    
                    try:
                        props = json.loads(json_str)
                        out.write("\n--- Property Keys Found ---\n")
                        out.write(str(list(props.keys())) + "\n")
                        out.write("\n--- Values Sample (Truncated) ---\n")
                        for k, v in props.items():
                            val_str = str(v)
                            if len(val_str) > 100:
                                val_str = val_str[:100] + "..."
                            out.write(f"{k}: {val_str}\n")
                    except Exception as e:
                        out.write(f"Error parsing properties: {e}\n")
                        out.write(f"Partial string: {json_str[:500]}...\n")
                else:
                    out.write("Could not find 'properties' marker after 'features'.\n")
            else:
                out.write("Could not find 'features' list.\n")
    print(f"Done. Output written to {OUTPUT_PATH}")

if __name__ == "__main__":
    inspect_schema()
