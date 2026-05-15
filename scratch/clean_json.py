import json
import csv
import os

path = r"C:/Users/koush/.gemini/antigravity/brain/0474cc45-798f-4177-aeb2-c1d1eae46f6b/.system_generated/steps/859/output.txt"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
    start = content.find('[')
    json_str = content[start:]
    
    # Aggressive escape
    fixed = json_str.replace('\\', '\\\\')
    # Fix the essential JSON structure backslashes
    fixed = fixed.replace('\\\\"', '\\"')
    fixed = fixed.replace('\\\\/', '\\/') # just in case
    
    data = json.loads(fixed)
    print(f"Loaded {len(data)} entries.")
    
    # Write to a clean JSON file
    with open('clean_data.json', 'w') as f2:
        json.dump(data, f2, indent=2)
