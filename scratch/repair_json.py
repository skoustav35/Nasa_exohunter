import json
import re

path = r"C:/Users/koush/.gemini/antigravity/brain/0474cc45-798f-4177-aeb2-c1d1eae46f6b/.system_generated/steps/859/output.txt"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
    print(f"Content length: {len(content)}")
    start = content.find('[')
    json_str = content[start:]
    
    # Try to find the exact error
    try:
        json.loads(json_str)
        print("Success without changes!")
    except Exception as e:
        print(f"Original error: {e}")
        
    # Try with escaping all backslashes EXCEPT those already part of an escape
    # But wait, maybe just escape EVERYTHING and then fix the quotes?
    fixed = json_str.replace('\\', '\\\\')
    fixed = fixed.replace('\\\\"', '\\"')
    fixed = fixed.replace('\\\\n', '\\n')
    
    try:
        json.loads(fixed)
        print("Success with double-backslash + fix!")
    except Exception as e:
        print(f"Error with double-backslash + fix: {e}")
        # Find where it's failing
        match = re.search(r'char (\d+)', str(e))
        if match:
            pos = int(match.group(1))
            print(f"Context at {pos}: {fixed[pos-20:pos+20]}")
