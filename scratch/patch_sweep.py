"""Patch verification_functions.py: v5.0 Recursive Sweep + Geometric Sanity Gate"""
import sys

filepath = r'c:\Users\koush\Downloads\Nasa_exohunter-main\Nasa_exohunter-main\verification_functions.py'

with open(filepath, 'rb') as f:
    raw = f.read()

# Normalize to LF for matching
content = raw.decode('utf-8').replace('\r\n', '\n').replace('\r', '\n')

changes = 0

# === Patch 1: Replace sweep header ===
old1 = '# ── SUB-SIGNAL SWEEP PROTOCOL (v4.1) ──'
new1 = '# ── SUB-SIGNAL SWEEP PROTOCOL (v5.0 -- Recursive Multi-Pass) ──'
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
    print("[OK] Sweep header")

# === Patch 2: Add recursive loop vars after comment ===
old2 = "# If there's a massive glint, we mask it out and rescan the residuals"
new2 = ("# If there's a massive glint, we mask it out and rescan the residuals.\n"
        "        # v5.0: Up to 3 recursive passes to strip multi-layer artifacts.\n"
        "        sweep_pass = 0\n"
        "        max_sweep_passes = 3")
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
    print("[OK] Recursive vars added")

# === Patch 3: if -> while ===
old3 = '        if depth_sanity.get("alert") and depth > depth_sanity.get("alert_threshold_5x_jup", 1.0):'
new3 = '        while depth_sanity.get("alert") and depth > depth_sanity.get("alert_threshold_5x_jup", 1.0) and sweep_pass < max_sweep_passes:\n            sweep_pass += 1'
if old3 in content:
    content = content.replace(old3, new3, 1)
    changes += 1
    print("[OK] if -> while")

# === Patch 4: Progress message ===
old4 = 'progress_callback(50, "Massive Depth Alert triggered. Executing Sub-Signal Sweep.")'
new4 = 'progress_callback(50, f"Sub-Signal Sweep pass {sweep_pass}/{max_sweep_passes}.")'
if old4 in content:
    content = content.replace(old4, new4, 1)
    changes += 1
    print("[OK] Progress msg")

# === Patch 5: Success message ===
old5 = 'Sub-Signal Sweep successful. Recovered new signal: depth'
new5 = 'Sub-Signal Sweep pass {sweep_pass} successful. Recovered: depth'
if old5 in content:
    content = content.replace(old5, new5, 1)
    changes += 1
    print("[OK] Success msg")

# === Patch 6: Geometric Sanity Gate ===
gate_marker = '        # ── Step 4: Run resonance masking ──'
gate_code = '''        # ── Step 3.75: Geometric Sanity Gate (v5.0 -- Duration Lockdown) ──
        # Compute T_max from stellar density and check if measured duration exceeds it.
        geometric_sanity = {"triggered": False}
        if transit_duration_hours > 0 and period_float > 0:
            r_star_sol = stellar.get("stellar_radius_solar", 1.0)
            m_star_sol = stellar.get("stellar_mass_solar", r_star_sol ** 1.25)
            r_star_m = r_star_sol * 6.957e8
            m_star_kg = m_star_sol * 1.989e30
            a_m = ((6.674e-11 * m_star_kg * (period_float * 86400.0)**2) / (4.0 * math.pi**2)) ** (1.0/3.0)
            a_over_r = a_m / max(r_star_m, 1e6)
            if a_over_r > 1.01:
                k_est = math.sqrt(max(depth, 1e-8))
                arg = min(0.999, (1.0 + k_est) / a_over_r)
                t_max_hours = (period_float * 24.0 / math.pi) * math.asin(arg)
                if transit_duration_hours > t_max_hours * 1.1:
                    geometric_sanity = {
                        "triggered": True,
                        "measured_duration_hours": round(transit_duration_hours, 4),
                        "t_max_hours": round(t_max_hours, 4),
                        "excess_ratio": round(transit_duration_hours / t_max_hours, 3),
                        "action": "Duration exceeds Keplerian T_max by >10%. Truncated to T_max.",
                    }
                    transit_duration_hours = t_max_hours
                    if progress_callback:
                        progress_callback(53, f"Geometric Sanity Gate: Duration truncated to T_max = {t_max_hours:.2f}h")

        ''' + gate_marker

if gate_marker in content:
    content = content.replace(gate_marker, gate_code, 1)
    changes += 1
    print("[OK] Geometric Sanity Gate")

# Write back preserving original line endings (convert back to CRLF since most of the file uses it)
with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print(f"\nTotal patches applied: {changes}")
