path = r"C:/Users/koush/.gemini/antigravity/brain/0474cc45-798f-4177-aeb2-c1d1eae46f6b/.system_generated/steps/859/output.txt"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    line9 = lines[8]
    print(f"Line 9 length: {len(line9)}")
    print(f"Char at 380: {line9[379:381]}")
    print(f"Context: {line9[350:410]}")
