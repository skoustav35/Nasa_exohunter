"""Research-note generation helpers."""

from __future__ import annotations

import os
import shutil
import subprocess
from typing import Optional


def _slugify(value: str) -> str:
    clean = []
    for character in value:
        if character.isalnum():
            clean.append(character)
        elif character in {"-", "_"}:
            clean.append(character)
        else:
            clean.append("_")
    return "".join(clean).strip("_") or "target"


def generate_rnaas_template(
    profile: dict,
    output_dir: str = "reports",
    author_name: str = "Koustav Sarkar",
    build_pdf: bool = False,
) -> dict:
    os.makedirs(output_dir, exist_ok=True)
    tic_id = str(profile.get("ticId", "unknown"))
    orbital = profile.get("inferred_orbital", {})
    stellar = profile.get("inferred_stellar", {})
    validation = profile.get("validation", {})
    filename_root = _slugify(f"TIC_{tic_id}_rnaas")
    tex_path = os.path.join(output_dir, f"{filename_root}.tex")

    tex = f"""\\documentclass{{RNAAS}}
\\usepackage{{amsmath}}
\\usepackage{{siunitx}}
\\begin{{document}}

\\title{{Sovereign ExoHunter Validation Note for TIC {tic_id}}}
\\author{{{author_name}}}

\\section*{{Summary}}
We report the automated validation state for TIC {tic_id} from the Sovereign ExoHunter pipeline.
The candidate was analyzed with impact-parameter vetting, secondary-eclipse screening, independent anti-confirmation checks, and false-positive probability scoring.

\\section*{{Key Parameters}}
Measured transit depth: $\\delta = {profile.get("measured_transit_depth", "N/A")}$.
Measured signal-to-noise ratio: $\\mathrm{{SNR}} = {profile.get("measured_snr", "N/A")}$.
Orbital period: $P = {profile.get("orbital_period_days", "N/A")}~\\mathrm{{d}}$.
Transit duration: $T_{{14}} = {profile.get("transit_duration_hours", "N/A")}~\\mathrm{{h}}$.
Planet radius: $R_p = {orbital.get("planet_radius_earth", "N/A")}~R_\\oplus$.
Equilibrium temperature: $T_{{eq}} = {orbital.get("equilibrium_temperature_K", "N/A")}~\\mathrm{{K}}$.
Stellar radius: $R_\\star = {stellar.get("stellar_radius_solar", "N/A")}~R_\\odot$.
Validation probability: $p_{{\\mathrm{{val}}}} = {validation.get("validation_probability", "N/A")}$.

\\section*{{Interpretation}}
Pipeline classification: {orbital.get("classification", "N/A")}.
Validation tier: {validation.get("tier", "N/A")}.
Summary statement: {profile.get("summary", "N/A")}

\\end{{document}}
"""

    with open(tex_path, "w", encoding="utf-8") as handle:
        handle.write(tex)

    pdf_path: Optional[str] = None
    if build_pdf and shutil.which("pdflatex"):
        try:
            subprocess.run(
                ["pdflatex", "-interaction=nonstopmode", os.path.basename(tex_path)],
                cwd=output_dir,
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            candidate_pdf = os.path.join(output_dir, f"{filename_root}.pdf")
            if os.path.exists(candidate_pdf):
                pdf_path = candidate_pdf
        except Exception:
            pdf_path = None

    return {
        "tex_path": tex_path,
        "pdf_path": pdf_path,
    }


def generate_methodology_whitepaper(
    profile: dict,
    output_dir: str = "reports",
    author_name: str = "Koustav Sarkar",
    build_pdf: bool = False,
) -> dict:
    """Generate a methodology whitepaper summarizing all vetting evidence.

    Astrophysical basis:
    Validation is strongest when every quantitative veto and supporting metric
    is preserved in a transparent record. This whitepaper captures the
    contamination correction, centroid diagnostics, eclipse search, and
    sovereign integrity logic in a publication-style artifact.
    """
    os.makedirs(output_dir, exist_ok=True)
    tic_id = str(profile.get("ticId", "unknown"))
    orbital = profile.get("inferred_orbital", {})
    stellar = profile.get("inferred_stellar", {})
    validation = profile.get("validation", {})
    shape = profile.get("shape_analysis", {})
    impact = profile.get("impact_parameter_report", {})
    secondary = profile.get("secondary_eclipse_report", {})
    centroid = profile.get("centroid_report", {})
    contamination = orbital.get("contamination_correction", {})
    filename_root = _slugify(f"TIC_{tic_id}_methodology")
    tex_path = os.path.join(output_dir, f"{filename_root}.tex")

    tex = f"""\\documentclass[11pt]{{article}}
\\usepackage{{geometry}}
\\geometry{{margin=1in}}
\\usepackage{{amsmath}}
\\usepackage{{booktabs}}
\\begin{{document}}

\\title{{Sarkar ExoHunter Methodology Whitepaper for TIC {tic_id}}}
\\author{{{author_name}}}
\\date{{\\today}}
\\maketitle

\\section*{{Executive Summary}}
This whitepaper records the full ExoHunter vetting chain for TIC {tic_id}. The candidate classification is {orbital.get("classification", "N/A")} with a Sovereign Integrity Score of {profile.get("physical_integrity_score", "N/A")}/100 and a validation probability of {validation.get("validation_probability", "N/A")}.

\\section*{{Photometric and Stellar Context}}
Measured transit depth: $\\delta = {profile.get("measured_transit_depth", "N/A")}$.
Orbital period: $P = {profile.get("orbital_period_days", "N/A")}~\\mathrm{{d}}$.
Transit duration: $T_{{14}} = {profile.get("transit_duration_hours", "N/A")}~\\mathrm{{h}}$.
Host-star density: $\\rho_\\star = {stellar.get("stellar_density_cgs", "N/A")}~\\mathrm{{g\\,cm^{{-3}}}}$.
Observed planet radius: $R_{{p,obs}} = {contamination.get("observed_radius_earth", orbital.get("planet_radius_earth", "N/A"))}~R_\\oplus$.
Contamination-corrected radius: $R_{{p,corr}} = {contamination.get("corrected_radius_earth", orbital.get("planet_radius_earth", "N/A"))}~R_\\oplus$.

\\section*{{Vetting Checks Performed}}
\\begin{{tabular}}{{@{{}}ll@{{}}}}
\\toprule
Check & Result \\\\
\\midrule
Impact Parameter & {impact.get("impact_parameter", "N/A")} \\\\
Secondary Eclipse Significance & {secondary.get("significance_sigma", "N/A")} sigma \\\\
Centroid Offset & {centroid.get("shift_pixels", "N/A")} pixels \\\\
Transit Morphology & {shape.get("shape", "N/A")} \\\\
Contamination Ratio & {contamination.get("contamination_ratio", "N/A")} \\\\
Validation Tier & {validation.get("tier", "N/A")} \\\\
\\bottomrule
\\end{{tabular}}

\\section*{{Sovereign Logic and Interpretation}}
The anti-confirmation module status is {profile.get("independent_cognitive_protocol", {}).get("status", "N/A")}. Arguments raised against the candidate: {", ".join(profile.get("independent_cognitive_protocol", {}).get("arguments", [])) or "None"}.

\\section*{{Conclusion}}
{profile.get("summary", "N/A")}

\\end{{document}}
"""

    with open(tex_path, "w", encoding="utf-8") as handle:
        handle.write(tex)

    pdf_path: Optional[str] = None
    if build_pdf and shutil.which("pdflatex"):
        try:
            subprocess.run(
                ["pdflatex", "-interaction=nonstopmode", os.path.basename(tex_path)],
                cwd=output_dir,
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            candidate_pdf = os.path.join(output_dir, f"{filename_root}.pdf")
            if os.path.exists(candidate_pdf):
                pdf_path = candidate_pdf
        except Exception:
            pdf_path = None

    return {
        "tex_path": tex_path,
        "pdf_path": pdf_path,
    }
