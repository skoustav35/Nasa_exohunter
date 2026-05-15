import json
import csv
import re
import os

MAX_THESIS_EXPORT_CHARS = 3000


def flatten_thesis(thesis_text, limit=MAX_THESIS_EXPORT_CHARS):
    flattened = (thesis_text or "").replace("\n", "  ").strip()
    return flattened[:limit]


def first_match(text, patterns):
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            continue
        groups = [group for group in match.groups() if group]
        return (groups[0] if groups else match.group(1)).strip()
    return ""


def parse_thesis(thesis_text):
    """
    Parses a Markdown thesis string to extract structured physical parameters.
    """
    params = {
        "transit_depth": "",
        "snr": "",
        "planet_radius_earth": "",
        "planet_radius_jupiter": "",
        "orbital_period": "",
        "transit_duration": "",
        "equilibrium_temp": "",
        "stellar_radius": "",
        "stellar_temp": "",
        "stellar_mag": "",
        "classification": "",
        "verdict": "",
        "applied_ldc_u1": "",
        "applied_ldc_u2": "",
        "crowdsap_factor": "",
        "calculated_impact_b": "",
        "mcmc_radius_earth": "",
        "impact_parameter": "",
        "inclination_deg": "",
        "duration_rescan": "",
        "crowdsap_correction": "",
        "qld_source": "",
        "stellar_lockdown_source": "",
    }
    
    if not thesis_text:
    
    # Extract Audit Trace
    u1_match = re.search(r"Applied_LDC_u1\*\*: (.*?)(?:\n|$)", thesis_text)
    if u1_match:
        params["applied_ldc_u1"] = u1_match.group(1).strip()
    
    u2_match = re.search(r"Applied_LDC_u2\*\*: (.*?)(?:\n|$)", thesis_text)
    if u2_match:
        params["applied_ldc_u2"] = u2_match.group(1).strip()
        
    crowdsap_match = re.search(r"CROWDSAP_Factor\*\*: (.*?)(?:\n|$)", thesis_text)
    if crowdsap_match:
        params["crowdsap_factor"] = crowdsap_match.group(1).strip()
        
    impact_match = re.search(r"Calculated_Impact_b\*\*: (.*?)(?:\n|$)", thesis_text)
    if impact_match:
        params["calculated_impact_b"] = impact_match.group(1).strip()

    return params

    params["transit_depth"] = first_match(thesis_text, [
        r"Depth \(.*?\)\*\*: (.*?)(?:\n|$)",
        r"Depth:\*\* (.*?)(?:\n|$)",
        r"Transit Depth.*?:\s*(.*?)(?:\n|$)",
    ])
    params["snr"] = first_match(thesis_text, [
        r"Ratio \(SNR\)\*\*: (.*?)(?:\n|$)",
        r"Signal-to-Noise Ratio:\s*(.*?)(?:\n|$)",
        r"SNR:\s*(.*?)(?:\n|$)",
    ])
    params["planet_radius_earth"] = first_match(thesis_text, [
        r"Radius \(.*?\)\*\*: (.*?)(?:\n|$)",
        r"Planet Radius:\s*(.*?)(?:\n|$)",
    ])
    params["orbital_period"] = first_match(thesis_text, [
        r"Period \(.*?\)\*\*: (.*?)(?:\n|$)",
        r"Orbital Period.*?:\s*(.*?)(?:\n|$)",
    ])
    params["transit_duration"] = first_match(thesis_text, [
        r"Duration\*\*: (.*?)(?:\n|$)",
        r"Transit Duration:\s*(.*?)(?:\n|$)",
    ])
    params["equilibrium_temp"] = first_match(thesis_text, [
        r"Temperature \(T_\{eq\}\)\*\*: (.*?)(?:\n|$)",
        r"Equilibrium Temperature.*?:\s*(.*?)(?:\n|$)",
    ])
    params["stellar_radius"] = first_match(thesis_text, [
        r"Stellar Radius \(.*?\)\*\*: (.*?)(?:\n|$)",
        r"Stellar Radius.*?:\s*(.*?)(?:\n|$)",
    ])
    params["stellar_temp"] = first_match(thesis_text, [
        r"Effective Temperature \(.*?\)\*\*: (.*?)(?:\n|$)",
        r"T_eff.*?:\s*(.*?)(?:\n|$)",
    ])
    params["stellar_mag"] = first_match(thesis_text, [
        r"Stellar Magnitude \(.*?\)\*\*: (.*?)(?:\n|$)",
        r"Stellar Magnitude.*?:\s*(.*?)(?:\n|$)",
    ])
    params["classification"] = first_match(thesis_text, [
        r"Classification\*\*: (.*?)(?:\n|$)",
        r"Classification:\s*(.*?)(?:\n|$)",
    ])
    params["verdict"] = first_match(thesis_text, [
        r"Verdict: (.*?)(?:\n|$)",
        r"Discovery Status.*?:\s*(.*?)(?:\n|$)",
    ])
    params["applied_ldc_u1"] = first_match(thesis_text, [r"Applied_LDC_u1\*\*: (.*?)(?:\n|$)", r"u1.*?:\s*(.*?)(?:\n|$)"])
    params["applied_ldc_u2"] = first_match(thesis_text, [r"Applied_LDC_u2\*\*: (.*?)(?:\n|$)", r"u2.*?:\s*(.*?)(?:\n|$)"])
    params["crowdsap_factor"] = first_match(thesis_text, [r"CROWDSAP_Factor\*\*: (.*?)(?:\n|$)", r"CROWDSAP.*?:\s*(.*?)(?:\n|$)"])
    params["calculated_impact_b"] = first_match(thesis_text, [r"Calculated_Impact_b\*\*: (.*?)(?:\n|$)"])
    params["mcmc_radius_earth"] = first_match(thesis_text, [r"MCMC Radius.*?:\s*(.*?)(?:\n|$)"])
    params["impact_parameter"] = first_match(thesis_text, [r"Impact Parameter.*?:\s*(.*?)(?:\n|$)"])
    params["inclination_deg"] = first_match(thesis_text, [r"Inclination.*?:\s*(.*?)(?:\n|$)"])
    params["duration_rescan"] = first_match(thesis_text, [r"Duration Re-Scan.*?:\s*(.*?)(?:\n|$)"])
    params["crowdsap_correction"] = first_match(thesis_text, [r"CROWDSAP Correction.*?:\s*(.*?)(?:\n|$)"])
    params["qld_source"] = first_match(thesis_text, [r"QLD Source.*?:\s*(.*?)(?:\n|$)"])
    params["stellar_lockdown_source"] = first_match(thesis_text, [r"Stellar Lockdown Source.*?:\s*(.*?)(?:\n|$)"])


    # Extract Audit Trace
    u1_match = re.search(r"Applied_LDC_u1\*\*: (.*?)(?:\n|$)", thesis_text)
    if u1_match:
        params["applied_ldc_u1"] = u1_match.group(1).strip()
    
    u2_match = re.search(r"Applied_LDC_u2\*\*: (.*?)(?:\n|$)", thesis_text)
    if u2_match:
        params["applied_ldc_u2"] = u2_match.group(1).strip()
        
    crowdsap_match = re.search(r"CROWDSAP_Factor\*\*: (.*?)(?:\n|$)", thesis_text)
    if crowdsap_match:
        params["crowdsap_factor"] = crowdsap_match.group(1).strip()
        
    impact_match = re.search(r"Calculated_Impact_b\*\*: (.*?)(?:\n|$)", thesis_text)
    if impact_match:
        params["calculated_impact_b"] = impact_match.group(1).strip()

    return params

def run():
    # Paths to the fetched files
    query_stream_file = r"C:/Users/koush/.gemini/antigravity/brain/95342ce8-e087-4e87-9003-578bb71c4b12/.system_generated/steps/73/output.txt"
    discovery_file = r"C:/Users/koush/.gemini/antigravity/brain/95342ce8-e087-4e87-9003-578bb71c4b12/.system_generated/steps/76/output.txt"
    rejection_file = r"C:/Users/koush/.gemini/antigravity/brain/95342ce8-e087-4e87-9003-578bb71c4b12/.system_generated/steps/79/output.txt"
    
    all_data = []
    seen_ids = set()

    files_to_process = [
        (query_stream_file, "Query Stream"),
        (discovery_file, "Discovery Lab"),
        (rejection_file, "False Positive Archive")
    ]

    for file_path, source in files_to_process:
        if not os.path.exists(file_path):
            print(f"Warning: File {file_path} not found.")
            continue
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # The tool output might have some header text, we need to extract the JSON part
            try:
                # Find start of JSON array
                start_index = content.find('[')
                if start_index == -1: continue
                json_data = json.loads(content[start_index:])
                
                for entry in json_data:
                    # Deduplicate by unique entry ID if available, else TIC + timestamp
                    uid = entry.get('id', entry.get('ticId', '') + entry.get('createdAt', ''))
                    if uid in seen_ids:
                        continue
                    seen_ids.add(uid)

                    thesis_text = entry.get('thesis', '')
                    parsed = parse_thesis(thesis_text)
                    
                    row = {
                        "TIC ID": entry.get('ticId', ''),
                        "Researcher": entry.get('researcherName', ''),
                        "Created At": entry.get('createdAt', ''),
                        "Status": entry.get('status', ''),
                        "Source": source,
                        "Verdict": parsed["verdict"],
                        "Classification": parsed["classification"],
                        "Transit Depth": parsed["transit_depth"],
                        "SNR": parsed["snr"],
                        "Planet Radius": parsed["planet_radius_earth"],
                        "Orbital Period": parsed["orbital_period"],
                        "Transit Duration": parsed["transit_duration"],
                        "Equilibrium Temp": parsed["equilibrium_temp"],
                        "Stellar Radius": parsed["stellar_radius"],
                        "Stellar Temp": parsed["stellar_temp"],
                        "Stellar Mag": parsed["stellar_mag"],
                        "Applied_LDC_u1": parsed["applied_ldc_u1"],
                        "Applied_LDC_u2": parsed["applied_ldc_u2"],
                        "CROWDSAP_Factor": parsed["crowdsap_factor"],
                        "Calculated_Impact_b": parsed["calculated_impact_b"],
                        "MCMC Radius Earth": parsed["mcmc_radius_earth"],
                        "Impact Parameter": parsed["impact_parameter"],
                        "Inclination Deg": parsed["inclination_deg"],
                        "Duration Rescan": parsed["duration_rescan"],
                        "CROWDSAP Correction": parsed["crowdsap_correction"],
                        "QLD Source": parsed["qld_source"],
                        "Stellar Lockdown Source": parsed["stellar_lockdown_source"],
                        "Full Thesis": flatten_thesis(thesis_text)
                    }
                    all_data.append(row)
            except Exception as e:
                print(f"Error parsing {file_path}: {e}")

    # Sort by timestamp
    all_data.sort(key=lambda x: x['Created At'], reverse=True)

    # Write to CSV
    output_file = "master_exoplanet_research_report.csv"
    fieldnames = [
        "TIC ID", "Researcher", "Created At", "Status", "Source", "Verdict", 
        "Classification", "Transit Depth", "SNR", "Planet Radius", "Orbital Period", 
        "Transit Duration", "Equilibrium Temp", "Stellar Radius", "Stellar Temp", 
        "Stellar Mag", "Applied_LDC_u1", "Applied_LDC_u2", "CROWDSAP_Factor", 
        "Calculated_Impact_b", "Full Thesis"
    ]
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_data)

    print(f"Successfully generated {output_file} with {len(all_data)} records.")

if __name__ == "__main__":
    run()
