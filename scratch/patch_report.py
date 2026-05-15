import re

with open("scratch/generate_comprehensive_report.py", "r", encoding="utf-8") as f:
    content = f.read()

# Add keys to params
content = content.replace(
    '        "verdict": ""\n    }',
    '        "verdict": "",\n        "applied_ldc_u1": "",\n        "applied_ldc_u2": "",\n        "crowdsap_factor": "",\n        "calculated_impact_b": ""\n    }'
)

# Add extraction logic
extraction_logic = """
    # Extract Audit Trace
    u1_match = re.search(r"Applied_LDC_u1\\*\\*: (.*?)(?:\\n|$)", thesis_text)
    if u1_match:
        params["applied_ldc_u1"] = u1_match.group(1).strip()
    
    u2_match = re.search(r"Applied_LDC_u2\\*\\*: (.*?)(?:\\n|$)", thesis_text)
    if u2_match:
        params["applied_ldc_u2"] = u2_match.group(1).strip()
        
    crowdsap_match = re.search(r"CROWDSAP_Factor\\*\\*: (.*?)(?:\\n|$)", thesis_text)
    if crowdsap_match:
        params["crowdsap_factor"] = crowdsap_match.group(1).strip()
        
    impact_match = re.search(r"Calculated_Impact_b\\*\\*: (.*?)(?:\\n|$)", thesis_text)
    if impact_match:
        params["calculated_impact_b"] = impact_match.group(1).strip()

    return params"""
content = content.replace("    return params", extraction_logic)

# Add to row dict
row_dict_update = """                        "Stellar Mag": parsed["stellar_mag"],
                        "Applied_LDC_u1": parsed["applied_ldc_u1"],
                        "Applied_LDC_u2": parsed["applied_ldc_u2"],
                        "CROWDSAP_Factor": parsed["crowdsap_factor"],
                        "Calculated_Impact_b": parsed["calculated_impact_b"],
                        "Full Thesis": thesis_text.replace('\\n', '  ') # Flatten for CSV"""
content = content.replace(
    "                        \"Stellar Mag\": parsed[\"stellar_mag\"],\n                        \"Full Thesis\": thesis_text.replace('\\n', '  ') # Flatten for CSV",
    row_dict_update
)

# Update headers
new_headers = """    fieldnames = [
        "TIC ID", "Researcher", "Created At", "Status", "Source", "Verdict", 
        "Classification", "Transit Depth", "SNR", "Planet Radius", "Orbital Period", 
        "Transit Duration", "Equilibrium Temp", "Stellar Radius", "Stellar Temp", 
        "Stellar Mag", "Applied_LDC_u1", "Applied_LDC_u2", "CROWDSAP_Factor", 
        "Calculated_Impact_b", "Full Thesis"
    ]"""
content = re.sub(r'    fieldnames = \[\n.*?    \]', new_headers, content, flags=re.DOTALL)

with open("scratch/generate_comprehensive_report.py", "w", encoding="utf-8") as f:
    f.write(content)

print("scratch/generate_comprehensive_report.py updated successfully.")
