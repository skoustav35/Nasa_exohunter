import json
import csv
import re
import os

MAX_THESIS_EXPORT_CHARS = 3000

# Load data
discoveries_path = r'C:\Users\koush\.gemini\antigravity\brain\54239123-11ab-4c1b-9b08-16a8cdd03998\.system_generated\steps\540\output.txt'
rejections_path = r'C:\Users\koush\.gemini\antigravity\brain\54239123-11ab-4c1b-9b08-16a8cdd03998\.system_generated\steps\541\output.txt'

with open(discoveries_path, 'r', encoding='utf-8') as f:
    discoveries = json.load(f)
with open(rejections_path, 'r', encoding='utf-8') as f:
    rejections = json.load(f)

all_data = discoveries + rejections

def extract_param(text, patterns):
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return "N/A"


def thesis_export_text(text):
    return (text or "").replace('\n', ' | ')[:MAX_THESIS_EXPORT_CHARS]

# CSV headers
headers = [
    "TIC_ID", "Status", "Researcher", "Created_At", 
    "Transit_Depth_Pct", "SNR", "Planet_Radius_R_earth", 
    "Orbital_Period_Days", "Equilibrium_Temp_K", 
    "Stellar_Radius_R_sun", "Stellar_Teff_K", 
    "Stellar_Magnitude_V", "Classification", "Full_Thesis"
]

output_file = 'exohunter_research_report.csv'

with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=headers)
    writer.writeheader()
    
    for item in all_data:
        thesis = item.get('thesis', '')
        row = {
            "TIC_ID": item.get('ticId', 'N/A'),
            "Status": item.get('status', 'N/A'),
            "Researcher": item.get('researcherName', 'N/A'),
            "Created_At": item.get('createdAt', 'N/A'),
            
            # Extraction logic for parameters
            "Transit_Depth_Pct": extract_param(thesis, [r'Transit Depth.*?:\s*([\d\.]+)%', r'Measured Depth.*?:\s*([\d\.]+)%', r'Measured transit depth.*?:\s*([\d\.]+)%']),
            "SNR": extract_param(thesis, [r'SNR.*?:\s*([\d\.-]+)', r'Signal-to-Noise Ratio.*?:\s*([\d\.-]+)']),
            "Planet_Radius_R_earth": extract_param(thesis, [r'Planet Radius.*?:\s*([\d\.]+)[\s]*R', r'Planet Radius.*?:\s*([\d\.]+)[\s]*Earth Radii']),
            "Orbital_Period_Days": extract_param(thesis, [r'Orbital Period.*?:\s*([\d\.]+)[\s]*days']),
            "Equilibrium_Temp_K": extract_param(thesis, [r'Equilibrium Temperature.*?:\s*([\d\.]+)[\s]*K', r'T_eq.*?:\s*([\d\.]+)[\s]*K']),
            "Stellar_Radius_R_sun": extract_param(thesis, [r'Stellar Radius.*?:\s*([\d\.]+)[\s]*R']),
            "Stellar_Teff_K": extract_param(thesis, [r'Effective Temperature.*?:\s*([\d\.]+)[\s]*K', r'T_eff.*?:\s*([\d\.]+)[\s]*K']),
            "Stellar_Magnitude_V": extract_param(thesis, [r'Stellar Magnitude.*?:\s*([\d\.-]+)']),
            "Classification": extract_param(thesis, [r'Classification:\s*(.*)', r'Reason:\s*(.*)', r'Decision:\s*(.*)']),
            "Full_Thesis": thesis_export_text(thesis)
        }
        writer.writerow(row)

print(f"Successfully generated {output_file}")
