import json
import csv
import os
import sys

csv.field_size_limit(sys.maxsize)
MAX_THESIS_EXPORT_CHARS = 3000


def thesis_export_text(text):
    return (text or "")[:MAX_THESIS_EXPORT_CHARS]

discovery_file = r'C:\Users\koush\.gemini\antigravity\brain\95342ce8-e087-4e87-9003-578bb71c4b12\.system_generated\steps\25\output.txt'
rejection_file = r'C:\Users\koush\.gemini\antigravity\brain\95342ce8-e087-4e87-9003-578bb71c4b12\.system_generated\steps\26\output.txt'
output_file = r'c:\Users\koush\Downloads\Nasa_exohunter-main\Nasa_exohunter-main\detailed_research_theses_report.csv'

def process_theses():
    all_rows = []
    
    # Process Discoveries
    try:
        with open(discovery_file, 'r', encoding='utf-8') as f:
            discoveries = json.load(f)
            for d in discoveries:
                all_rows.append({
                    'TIC ID': d.get('ticId', ''),
                    'Type': 'Discovery',
                    'Researcher': d.get('researcherName', ''),
                    'Created At': d.get('createdAt', ''),
                    'Status': d.get('status', ''),
                    'Thesis Text': thesis_export_text(d.get('thesis', ''))
                })
    except Exception as e:
        print(f"Error processing discoveries: {e}")

    # Process Rejections
    try:
        with open(rejection_file, 'r', encoding='utf-8') as f:
            rejections = json.load(f)
            for r in rejections:
                all_rows.append({
                    'TIC ID': r.get('ticId', ''),
                    'Type': 'Rejection',
                    'Researcher': r.get('researcherName', ''),
                    'Created At': r.get('createdAt', ''),
                    'Status': r.get('status', ''),
                    'Thesis Text': thesis_export_text(r.get('thesis', ''))
                })
    except Exception as e:
        print(f"Error processing rejections: {e}")

    # Sort by Created At descending
    all_rows.sort(key=lambda x: x['Created At'], reverse=True)

    # Write CSV
    fieldnames = ['TIC ID', 'Type', 'Researcher', 'Created At', 'Status', 'Thesis Text']
    with open(output_file, 'w', encoding='utf-8', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"Successfully wrote {len(all_rows)} theses to {output_file}")

if __name__ == "__main__":
    process_theses()
