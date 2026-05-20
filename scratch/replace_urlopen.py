import re

file_path = r"c:\Users\koush\Downloads\Nasa_exohunter-main\Nasa_exohunter-main\exohunter\grounding.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace urllib.request.urlopen
new_content = content.replace("urllib.request.urlopen", "_urlopen")

# Check if there is any other urllib.request.urlopen
if "urllib.request.urlopen" in new_content:
    print("Warning: urllib.request.urlopen still present")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Replacement complete successfully!")
