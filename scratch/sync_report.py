import json
import csv
import os

MAX_THESIS_EXPORT_CHARS = 3000


def thesis_export_text(text):
    return (text or "")[:MAX_THESIS_EXPORT_CHARS]

discovery_file = r'C:/Users/koush/.gemini/antigravity/brain/0474cc45-798f-4177-aeb2-c1d1eae46f6b/.system_generated/steps/805/output.txt'
rejection_file = r'C:/Users/koush/.gemini/antigravity/brain/0474cc45-798f-4177-aeb2-c1d1eae46f6b/.system_generated/steps/808/output.txt'
output_file = r'c:\Users\koush\Downloads\Nasa_exohunter-main\Nasa_exohunter-main\detailed_research_theses_report.csv'

def sync_report():
    all_rows = []
    
    # Process Discoveries
    try:
        if os.path.exists(discovery_file):
            with open(discovery_file, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content:
                    discoveries = json.loads(content)
                    for d in discoveries:
                        all_rows.append({
                            'TIC ID': d.get('ticId', ''),
                            'Type': 'Discovery',
                            'Researcher': d.get('researcherName', ''),
                            'Created At': d.get('createdAt', ''),
                            'Status': d.get('status', 'New Discovery!'),
                            'Thesis Text': thesis_export_text(d.get('thesis', ''))
                        })
    except Exception as e:
        print(f"Error processing discoveries: {e}")

    # Process Rejections
    try:
        if os.path.exists(rejection_file):
            with open(rejection_file, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content:
                    rejections = json.loads(content)
                    for r in rejections:
                        all_rows.append({
                            'TIC ID': r.get('ticId', ''),
                            'Type': 'Rejection',
                            'Researcher': r.get('researcherName', ''),
                            'Created At': r.get('createdAt', ''),
                            'Status': r.get('status', 'Rejected'),
                            'Thesis Text': thesis_export_text(r.get('thesis', ''))
                        })
    except Exception as e:
        print(f"Error processing rejections: {e}")

    # Sort by Created At descending
    # We might have some items with missing createdAt, handle that
    all_rows.sort(key=lambda x: x.get('Created At') or '', reverse=True)

    # Write CSV
    fieldnames = ['TIC ID', 'Type', 'Researcher', 'Created At', 'Status', 'Thesis Text']
    with open(output_file, 'w', encoding='utf-8', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"Successfully synchronized {len(all_rows)} theses to {output_file}")

if __name__ == "__main__":
    sync_report()
