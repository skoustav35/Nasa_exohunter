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
    params = {
        "transit_depth": "", "snr": "", "planet_radius_earth": "",
        "orbital_period": "", "equilibrium_temp": "", "stellar_radius": "",
        "stellar_temp": "", "stellar_mag": "", "classification": "N/A", "verdict": "N/A"
    }
    if not thesis_text: return params
    
    # Simple extraction using regex
    d = re.search(r"Depth.*?\$([\d\.\,]+)\%", thesis_text)
    if d: params["transit_depth"] = d.group(1).replace(',', '')
    
    snr = re.search(r"SNR\)\*\*: \$([\d\.\,]+)\$", thesis_text)
    if snr: params["snr"] = snr.group(1).replace(',', '')
    
    pr = re.search(r"Planet Radius.*?\$([\d\.\,]+) R_\\\\oplus\$|Planet Radius.*?\$([\d\.\,]+) R_\\oplus\$", thesis_text)
    if pr: params["planet_radius_earth"] = next(x for x in pr.groups() if x).replace(',', '')
    
    op = re.search(r"Orbital Period.*?\$([\d\.\,]+) days\$", thesis_text)
    if op: params["orbital_period"] = op.group(1).replace(',', '')
    
    et = re.search(r"Equilibrium Temperature.*?\$([\d\.\,]+) K\$", thesis_text)
    if et: params["equilibrium_temp"] = et.group(1).replace(',', '')
    
    sr = re.search(r"Stellar Radius.*?\$([\d\.\,]+) R_\\\\odot\$|Stellar Radius.*?\$([\d\.\,]+) R_\\odot\$", thesis_text)
    if sr: params["stellar_radius"] = next(x for x in sr.groups() if x).replace(',', '')
    
    st = re.search(r"Effective Temperature.*?\$([\d\.]+) K\$", thesis_text)
    if st: params["stellar_temp"] = st.group(1)
    
    sm = re.search(r"Stellar Magnitude.*?\$([\d\.\-]+)\$", thesis_text)
    if sm: params["stellar_mag"] = sm.group(1)
    
    cl = re.search(r"Classification\*\*: \*\*(.*?)\*\*", thesis_text)
    if cl: params["classification"] = cl.group(1)
    
    return params

def run():
    discovery_path = r"C:/Users/koush/.gemini/antigravity/brain/0474cc45-798f-4177-aeb2-c1d1eae46f6b/.system_generated/steps/859/output.txt"
    
    if not os.path.exists(discovery_path):
        print("Discovery file not found")
        return

    with open(discovery_path, 'r', encoding='utf-8') as f:
        content = f.read()
        start = content.find('[')
        json_str = content[start:]
        # The ultimate repair
        fixed = json_str.replace('\\', '\\\\').replace('\\\\"', '\\"').replace('\\\\n', '\\n')
        data = json.loads(fixed)

    unique_entries = {}
    for entry in data:
        tic_id = entry.get('ticId')
        if not tic_id: continue
        
        thesis = entry.get('thesis', '')
        p = parse_thesis(thesis)
        
        row = {
            "TIC_ID": tic_id,
            "Status": entry.get('status', 'New Discovery!'),
            "Researcher": entry.get('researcherName', ''),
            "Created_At": entry.get('createdAt', ''),
            "Transit_Depth_Pct": p["transit_depth"],
            "SNR": p["snr"],
            "Planet_Radius_R_earth": p["planet_radius_earth"],
            "Orbital_Period_Days": p["orbital_period"],
            "Equilibrium_Temp_K": p["equilibrium_temp"],
            "Stellar_Radius_R_sun": p["stellar_radius"],
            "Stellar_Teff_K": p["stellar_temp"],
            "Stellar_Magnitude_V": p["stellar_mag"],
            "Classification": p["classification"],
            "Full_Thesis": thesis_export_text(thesis)
        }
        unique_entries[tic_id] = row

    final_data = sorted(unique_entries.values(), key=lambda x: x['TIC_ID'])
    
    # Write reports
    for filename, fieldnames in [
        ("exohunter_research_report.csv", ["TIC_ID", "Status", "Researcher", "Created_At", "Transit_Depth_Pct", "SNR", "Planet_Radius_R_earth", "Orbital_Period_Days", "Equilibrium_Temp_K", "Stellar_Radius_R_sun", "Stellar_Teff_K", "Stellar_Magnitude_V", "Classification", "Full_Thesis"]),
        ("detailed_research_theses_report.csv", ["TIC ID", "Type", "Researcher", "Created At", "Status", "Thesis Text"])
    ]:
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            if "detailed" in filename:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                for d in final_data:
                    writer.writerow({
                        "TIC ID": d["TIC_ID"], "Type": "Discovery", "Researcher": d["Researcher"],
                        "Created At": d["Created_At"], "Status": d["Status"], "Thesis Text": thesis_export_text(d["Full_Thesis"], multiline=True)
                    })
            else:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(final_data)

    print(f"Successfully updated reports with {len(final_data)} unique entries.")

if __name__ == "__main__":
    run()
