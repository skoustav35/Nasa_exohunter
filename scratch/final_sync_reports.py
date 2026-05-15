import json
import csv
import re
import os

MAX_THESIS_EXPORT_CHARS = 3000


def thesis_export_text(text, multiline=False):
    flattened = (text or "").replace('\n', ' | ')
    exported = flattened[:MAX_THESIS_EXPORT_CHARS]
    return exported.replace(' | ', '\n') if multiline else exported

def parse_thesis(thesis_text):
    """
    Parses a Markdown thesis string to extract structured physical parameters.
    """
    params = {
        "transit_depth": "",
        "snr": "",
        "planet_radius_earth": "",
        "orbital_period": "",
        "equilibrium_temp": "",
        "stellar_radius": "",
        "stellar_temp": "",
        "stellar_mag": "",
        "classification": "N/A",
        "verdict": "N/A"
    }
    
    if not thesis_text:
        return params

    # Extract Depth
    depth_match = re.search(r"Depth \(.*?\)\*\*: \$(.*?)\$|Depth:\*\* \$(.*?)\$|Depth \(\\delta\)\*\*: \$(.*?)\$", thesis_text)
    if depth_match:
        params["transit_depth"] = next(x for x in depth_match.groups() if x is not None).replace('%', '').strip()

    # Extract SNR
    snr_match = re.search(r"Ratio \(SNR\)\*\*: \$(.*?)\$", thesis_text)
    if snr_match:
        params["snr"] = snr_match.group(1).strip()

    # Extract Radius
    radius_match = re.search(r"Radius \(\$R_p\$\)\*\*: \$(.*?) R_\\oplus\$|Radius \(\$R_p\$\)\*\*: \$(.*?) R_\oplus\$", thesis_text)
    if radius_match:
        params["planet_radius_earth"] = next(x for x in radius_match.groups() if x is not None).strip()
    
    # Extract Period
    period_match = re.search(r"Period \(\$P\$\)\*\*: \$(.*?) days\$", thesis_text)
    if period_match:
        params["orbital_period"] = period_match.group(1).strip()

    # Extract Temperature
    temp_match = re.search(r"Temperature \(\$T_{eq}\$\)\*\*: \$(.*?) K\$", thesis_text)
    if temp_match:
        params["equilibrium_temp"] = temp_match.group(1).strip()

    # Extract Stellar Info
    s_radius_match = re.search(r"Stellar Radius \(\$R_\*\$\)\*\*: \$(.*?) R_\\odot\$|Stellar Radius \(\$R_*\$\)\*\*: \$(.*?) R_\odot\$", thesis_text)
    if s_radius_match:
        params["stellar_radius"] = next(x for x in s_radius_match.groups() if x is not None).split('(')[0].strip()

    s_temp_match = re.search(r"Effective Temperature \(\$T_{eff}\$\)\*\*: \$(.*?) K\$", thesis_text)
    if s_temp_match:
        params["stellar_temp"] = s_temp_match.group(1).strip()

    s_mag_match = re.search(r"Stellar Magnitude \(\$V\$\)\*\*: \$(.*?)\$", thesis_text)
    if s_mag_match:
        params["stellar_mag"] = s_mag_match.group(1).strip()

    # Classification
    class_match = re.search(r"\*\*Classification\*\*: \*\*(.*?)\*\*", thesis_text)
    if class_match:
        params["classification"] = class_match.group(1).strip()

    # Verdict
    verdict_match = re.search(r"\*\*Verdict: (.*?)\*\*", thesis_text, re.IGNORECASE)
    if verdict_match:
        params["verdict"] = verdict_match.group(1).strip()

    return params

def run():
    # Fetch data from step outputs (using the latest ones)
    discovery_file = "clean_data.json"
    rejection_file = r"dummy_non_existent.txt"
    
    unique_entries = {}

    files_to_process = [
        (discovery_file, "Discovery"),
        (rejection_file, "Rejection")
    ]

    for file_path, entry_type in files_to_process:
        if not os.path.exists(file_path):
            continue
            
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                json_data = json.load(f)
                
                # Sort by createdAt to ensure we take the latest
                json_data.sort(key=lambda x: x.get('createdAt', ''), reverse=False)
                
                for entry in json_data:
                    tic_id = entry.get('ticId', '')
                    if not tic_id: continue
                    
                    thesis_text = entry.get('thesis', '')
                    parsed = parse_thesis(thesis_text)
                    
                    row = {
                        "TIC_ID": tic_id,
                        "Status": entry.get('status', 'Confirmed' if entry_type == "Discovery" else "Rejected"),
                        "Researcher": entry.get('researcherName', ''),
                        "Created_At": entry.get('createdAt', ''),
                        "Transit_Depth_Pct": parsed["transit_depth"],
                        "SNR": parsed["snr"],
                        "Planet_Radius_R_earth": parsed["planet_radius_earth"],
                        "Orbital_Period_Days": parsed["orbital_period"],
                        "Equilibrium_Temp_K": parsed["equilibrium_temp"],
                        "Stellar_Radius_R_sun": parsed["stellar_radius"],
                        "Stellar_Teff_K": parsed["stellar_temp"],
                        "Stellar_Magnitude_V": parsed["stellar_mag"],
                        "Classification": parsed["classification"],
                        "Full_Thesis": thesis_export_text(thesis_text)
                    }
                    # Update unique_entries (latest record for this TIC ID wins)
                    unique_entries[tic_id] = row
            except Exception as e:
                print(f"Error parsing {file_path}: {e}")

    # Convert to list and sort by TIC ID or Timestamp
    final_data = list(unique_entries.values())
    final_data.sort(key=lambda x: x['TIC_ID'])

    # Write to exohunter_research_report.csv
    report_file = "exohunter_research_report.csv"
    fieldnames = [
        "TIC_ID", "Status", "Researcher", "Created_At", "Transit_Depth_Pct", 
        "SNR", "Planet_Radius_R_earth", "Orbital_Period_Days", "Equilibrium_Temp_K", 
        "Stellar_Radius_R_sun", "Stellar_Teff_K", "Stellar_Magnitude_V", 
        "Classification", "Full_Thesis"
    ]
    
    with open(report_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(final_data)

    # Also update detailed_research_theses_report.csv
    theses_report_file = "detailed_research_theses_report.csv"
    theses_fieldnames = ["TIC ID", "Type", "Researcher", "Created At", "Status", "Thesis Text"]
    theses_data = []
    for entry in final_data:
        theses_data.append({
            "TIC ID": entry["TIC_ID"],
            "Type": "Discovery" if "Discovery" in entry["Status"] or "Confirmed" in entry["Status"] else "Rejection",
            "Researcher": entry["Researcher"],
            "Created At": entry["Created_At"],
            "Status": entry["Status"],
            "Thesis Text": thesis_export_text(entry["Full_Thesis"], multiline=True)
        })
    
    with open(theses_report_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=theses_fieldnames)
        writer.writeheader()
        writer.writerows(theses_data)

    print(f"Successfully synchronized {len(final_data)} unique records to {report_file} and {theses_report_file}.")

if __name__ == "__main__":
    print("Running Final Sync Reports Script v2.0")
    run()
