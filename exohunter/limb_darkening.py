"""
Quadratic Limb Darkening (QLD) Injector & Extreme Proximity Guard (v4.0)

Implements:
    1. Claret (2017) QLD coefficient lookup for the TESS bandpass
    2. Bilinear interpolation over (T_eff, log_g) grid
    3. Corrected radius formula: R_p = R_* * sqrt(delta / (1 - u1/3 - u2/6))
    4. Oblate Spheroid correction for ultra-short-period planets (P < 1.5d)
"""

from __future__ import annotations

import math
from typing import Optional, Tuple

# ═══════════════════════════════════════════════════════════════
# PHYSICAL CONSTANTS
# ═══════════════════════════════════════════════════════════════
G = 6.674e-11
M_SUN = 1.989e30
R_SUN = 6.957e8
R_EARTH = 6.371e6
R_JUPITER = 7.149e7

# ═══════════════════════════════════════════════════════════════
# 1. CLARET (2017) QLD COEFFICIENTS — TESS BANDPASS
# ═══════════════════════════════════════════════════════════════
# Grid: T_eff (3500–10000 K, step 250), log_g (3.0–5.0, step 0.5)
# Values: (u1, u2) quadratic limb darkening coefficients
# Source: Claret (2017) A&A 600, A30, Table for TESS bandpass
# Solar reference: T_eff=5750, log_g=4.5 → u1≈0.40, u2≈0.26

_TEFF_GRID = [3500, 3750, 4000, 4250, 4500, 4750, 5000, 5250,
              5500, 5750, 6000, 6250, 6500, 6750, 7000, 7500,
              8000, 8500, 9000, 9500, 10000]

_LOGG_GRID = [3.0, 3.5, 4.0, 4.5, 5.0]

# _LD_TABLE[(teff, logg)] = (u1, u2)
_LD_TABLE = {
    # T_eff = 3500 K
    (3500, 3.0): (0.54, 0.18), (3500, 3.5): (0.56, 0.17),
    (3500, 4.0): (0.58, 0.15), (3500, 4.5): (0.61, 0.12),
    (3500, 5.0): (0.63, 0.10),
    # T_eff = 3750 K
    (3750, 3.0): (0.52, 0.20), (3750, 3.5): (0.54, 0.19),
    (3750, 4.0): (0.56, 0.17), (3750, 4.5): (0.59, 0.14),
    (3750, 5.0): (0.61, 0.12),
    # T_eff = 4000 K
    (4000, 3.0): (0.50, 0.22), (4000, 3.5): (0.52, 0.21),
    (4000, 4.0): (0.54, 0.19), (4000, 4.5): (0.57, 0.16),
    (4000, 5.0): (0.59, 0.14),
    # T_eff = 4250 K
    (4250, 3.0): (0.48, 0.24), (4250, 3.5): (0.50, 0.23),
    (4250, 4.0): (0.52, 0.21), (4250, 4.5): (0.55, 0.18),
    (4250, 5.0): (0.57, 0.16),
    # T_eff = 4500 K
    (4500, 3.0): (0.46, 0.25), (4500, 3.5): (0.48, 0.24),
    (4500, 4.0): (0.50, 0.23), (4500, 4.5): (0.52, 0.20),
    (4500, 5.0): (0.54, 0.18),
    # T_eff = 4750 K
    (4750, 3.0): (0.44, 0.26), (4750, 3.5): (0.46, 0.25),
    (4750, 4.0): (0.48, 0.24), (4750, 4.5): (0.50, 0.22),
    (4750, 5.0): (0.52, 0.20),
    # T_eff = 5000 K
    (5000, 3.0): (0.42, 0.27), (5000, 3.5): (0.44, 0.26),
    (5000, 4.0): (0.46, 0.25), (5000, 4.5): (0.48, 0.23),
    (5000, 5.0): (0.50, 0.21),
    # T_eff = 5250 K
    (5250, 3.0): (0.41, 0.27), (5250, 3.5): (0.43, 0.26),
    (5250, 4.0): (0.44, 0.26), (5250, 4.5): (0.46, 0.24),
    (5250, 5.0): (0.48, 0.22),
    # T_eff = 5500 K
    (5500, 3.0): (0.39, 0.27), (5500, 3.5): (0.41, 0.27),
    (5500, 4.0): (0.43, 0.26), (5500, 4.5): (0.44, 0.25),
    (5500, 5.0): (0.46, 0.23),
    # T_eff = 5750 K (≈ Solar)
    (5750, 3.0): (0.37, 0.28), (5750, 3.5): (0.39, 0.27),
    (5750, 4.0): (0.41, 0.27), (5750, 4.5): (0.40, 0.26),
    (5750, 5.0): (0.42, 0.25),
    # T_eff = 6000 K
    (6000, 3.0): (0.35, 0.28), (6000, 3.5): (0.37, 0.28),
    (6000, 4.0): (0.38, 0.27), (6000, 4.5): (0.37, 0.27),
    (6000, 5.0): (0.39, 0.26),
    # T_eff = 6250 K
    (6250, 3.0): (0.33, 0.28), (6250, 3.5): (0.35, 0.28),
    (6250, 4.0): (0.36, 0.28), (6250, 4.5): (0.35, 0.28),
    (6250, 5.0): (0.36, 0.27),
    # T_eff = 6500 K
    (6500, 3.0): (0.30, 0.29), (6500, 3.5): (0.32, 0.28),
    (6500, 4.0): (0.33, 0.28), (6500, 4.5): (0.32, 0.28),
    (6500, 5.0): (0.34, 0.27),
    # T_eff = 6750 K
    (6750, 3.0): (0.28, 0.29), (6750, 3.5): (0.30, 0.29),
    (6750, 4.0): (0.31, 0.28), (6750, 4.5): (0.30, 0.29),
    (6750, 5.0): (0.31, 0.28),
    # T_eff = 7000 K
    (7000, 3.0): (0.26, 0.29), (7000, 3.5): (0.28, 0.29),
    (7000, 4.0): (0.29, 0.29), (7000, 4.5): (0.28, 0.29),
    (7000, 5.0): (0.29, 0.28),
    # T_eff = 7500 K
    (7500, 3.0): (0.23, 0.28), (7500, 3.5): (0.24, 0.28),
    (7500, 4.0): (0.25, 0.28), (7500, 4.5): (0.24, 0.29),
    (7500, 5.0): (0.25, 0.28),
    # T_eff = 8000 K
    (8000, 3.0): (0.20, 0.27), (8000, 3.5): (0.21, 0.27),
    (8000, 4.0): (0.22, 0.27), (8000, 4.5): (0.21, 0.28),
    (8000, 5.0): (0.22, 0.27),
    # T_eff = 8500 K
    (8500, 3.0): (0.18, 0.26), (8500, 3.5): (0.19, 0.26),
    (8500, 4.0): (0.20, 0.26), (8500, 4.5): (0.19, 0.27),
    (8500, 5.0): (0.20, 0.26),
    # T_eff = 9000 K
    (9000, 3.0): (0.16, 0.25), (9000, 3.5): (0.17, 0.25),
    (9000, 4.0): (0.18, 0.25), (9000, 4.5): (0.17, 0.26),
    (9000, 5.0): (0.18, 0.25),
    # T_eff = 9500 K
    (9500, 3.0): (0.14, 0.24), (9500, 3.5): (0.15, 0.24),
    (9500, 4.0): (0.16, 0.24), (9500, 4.5): (0.15, 0.25),
    (9500, 5.0): (0.16, 0.24),
    # T_eff = 10000 K
    (10000, 3.0): (0.13, 0.23), (10000, 3.5): (0.14, 0.23),
    (10000, 4.0): (0.14, 0.23), (10000, 4.5): (0.14, 0.24),
    (10000, 5.0): (0.14, 0.23),
}

# Solar defaults
_SOLAR_U1 = 0.40
_SOLAR_U2 = 0.26


def _find_bracket(value: float, grid: list) -> Tuple[int, int]:
    """Find the two adjacent grid points bracketing *value*."""
    if value <= grid[0]:
        return 0, 0
    if value >= grid[-1]:
        return len(grid) - 1, len(grid) - 1
    for i in range(len(grid) - 1):
        if grid[i] <= value <= grid[i + 1]:
            return i, i + 1
    return len(grid) - 1, len(grid) - 1


def _bilinear_interpolate(
    teff: float, logg: float
) -> Tuple[float, float]:
    """Bilinear interpolation of (u1, u2) over the Claret grid."""
    ti0, ti1 = _find_bracket(teff, _TEFF_GRID)
    gi0, gi1 = _find_bracket(logg, _LOGG_GRID)

    t0, t1 = _TEFF_GRID[ti0], _TEFF_GRID[ti1]
    g0, g1 = _LOGG_GRID[gi0], _LOGG_GRID[gi1]

    # Four corners
    q00 = _LD_TABLE.get((t0, g0), (_SOLAR_U1, _SOLAR_U2))
    q01 = _LD_TABLE.get((t0, g1), (_SOLAR_U1, _SOLAR_U2))
    q10 = _LD_TABLE.get((t1, g0), (_SOLAR_U1, _SOLAR_U2))
    q11 = _LD_TABLE.get((t1, g1), (_SOLAR_U1, _SOLAR_U2))

    # Fractions
    ft = (teff - t0) / max(t1 - t0, 1.0) if t1 != t0 else 0.0
    fg = (logg - g0) / max(g1 - g0, 0.01) if g1 != g0 else 0.0

    u1 = (
        q00[0] * (1 - ft) * (1 - fg)
        + q10[0] * ft * (1 - fg)
        + q01[0] * (1 - ft) * fg
        + q11[0] * ft * fg
    )
    u2 = (
        q00[1] * (1 - ft) * (1 - fg)
        + q10[1] * ft * (1 - fg)
        + q01[1] * (1 - ft) * fg
        + q11[1] * ft * fg
    )
    return round(u1, 4), round(u2, 4)


# ═══════════════════════════════════════════════════════════════
# PUBLIC API — LIMB DARKENING CORRECTION
# ═══════════════════════════════════════════════════════════════

def get_limb_darkening_correction(
    teff: Optional[float] = None,
    logg: Optional[float] = None,
    metallicity: Optional[float] = None,
    tic_id: Optional[str] = None,
) -> dict:
    """Return QLD coefficients and the correction factor for the radius formula.

    v5.0: If teff/logg are not provided but tic_id is given, automatically
    fetches Gaia DR3 stellar parameters via resolve_stellar_lockdown().

    The corrected planet radius is:
        R_p = R_* x sqrt( delta_corrected / (1 - u1/3 - u2/6) )

    Returns:
        {
            "u1": float,
            "u2": float,
            "ld_denominator": float,       # (1 - u1/3 - u2/6)
            "correction_factor": float,     # 1 / sqrt(ld_denominator)
            "source": "claret_2017_tess_interpolated" | "solar_default" | "gaia_dr3_auto",
            "teff_used": float,
            "logg_used": float,
        }
    """
    use_default = (teff is None or logg is None
                   or teff <= 0 or logg <= 0)

    # ── v5.0: Gaia DR3 auto-fetch for QLD when T_eff/logg missing ──
    gaia_source = False
    if use_default and tic_id:
        try:
            from exohunter.grounding import resolve_stellar_lockdown
            stellar = resolve_stellar_lockdown(tic_id)
            gaia_teff = stellar.get("effective_temperature_K")
            gaia_logg = stellar.get("logg")
            if gaia_teff and gaia_logg and gaia_teff > 0 and gaia_logg > 0:
                teff = gaia_teff
                logg = gaia_logg
                use_default = False
                gaia_source = True
        except Exception:
            pass  # Fall through to solar default

    if use_default:
        u1, u2 = _SOLAR_U1, _SOLAR_U2
        source = "solar_default_claret_2017_tess"
        teff_used = 5778.0
        logg_used = 4.44
    else:
        u1, u2 = _bilinear_interpolate(float(teff), float(logg))
        source = "gaia_dr3_auto_claret_2017_tess" if gaia_source else "claret_2017_tess_interpolated"
        teff_used = float(teff)
        logg_used = float(logg)

    ld_denominator = 1.0 - u1 / 3.0 - u2 / 6.0
    # Safety: ld_denominator should be ~0.8–0.9; clamp to avoid division issues
    ld_denominator = max(0.5, min(ld_denominator, 1.0))
    correction_factor = 1.0 / math.sqrt(ld_denominator)

    return {
        "u1": u1,
        "u2": u2,
        "ld_denominator": round(ld_denominator, 6),
        "correction_factor": round(correction_factor, 6),
        "source": source,
        "source_reference": "Claret 2017 A&A 600 A30 TESS quadratic coefficients",
        "metallicity_used": float(metallicity) if metallicity is not None else 0.0,
        "metallicity_assumption": "solar fallback" if metallicity is None else "catalog value",
        "teff_used": teff_used,
        "logg_used": logg_used,
    }


# ═══════════════════════════════════════════════════════════════
# 2. CROWDSAP / FLUX DILUTION CORRECTION
# ═══════════════════════════════════════════════════════════════

def compute_crowdsap_from_contratio(
    contamination_ratio: Optional[float],
) -> dict:
    """Convert a TIC contamination ratio to an effective CROWDSAP value.

    CROWDSAP is the fraction of flux from the target star in the aperture.
        CROWDSAP = 1 / (1 + contamination_ratio)

    If CROWDSAP < 1.0, the observed transit depth is diluted:
        δ_intrinsic = δ_observed / CROWDSAP

    Returns:
        {
            "crowdsap": float,
            "dilution_factor": float,   # 1 / CROWDSAP (multiply depth by this)
            "contamination_ratio": float,
            "source": str,
        }
    """
    cr = max(0.0, float(contamination_ratio or 0.0))
    crowdsap = 1.0 / (1.0 + cr)
    dilution_factor = 1.0 / max(crowdsap, 0.01)

    return {
        "crowdsap": round(crowdsap, 6),
        "dilution_factor": round(dilution_factor, 6),
        "contamination_ratio": round(cr, 6),
        "is_diluted": crowdsap < 0.99,
        "source": "contratio_derived",
    }


# ═══════════════════════════════════════════════════════════════
# 3. EXTREME PROXIMITY GUARD — OBLATE SPHEROID CORRECTION
# ═══════════════════════════════════════════════════════════════

def _estimate_planet_mass_jupiter(r_planet_earth: float) -> float:
    """Estimate planet mass using Chen & Kipping (2017) mass-radius relation.

    For gas giants (R > 4 R_earth):
        M ≈ (R / 11.2)^2.06 × M_Jup    (empirical power law)
    For smaller planets:
        M ≈ (R)^1.70 × M_earth → convert to M_Jup
    """
    M_EARTH_MJUP = 1.0 / 317.8
    if r_planet_earth >= 4.0:
        return (r_planet_earth / 11.2) ** 2.06
    else:
        m_earth = r_planet_earth ** 1.70
        return m_earth * M_EARTH_MJUP


def get_extreme_proximity_correction(
    period_days: float,
    r_star_solar: float,
    m_star_solar: float,
    r_planet_earth: Optional[float] = None,
    m_planet_jupiter: Optional[float] = None,
) -> dict:
    """Compute the oblate spheroid correction for ultra-short-period planets.

    Trigger: period_days < 1.5

    Physics:
    For extremely short-period planets, the host star is tidally distorted:
        1. Tidal bulge from the planet increases the effective stellar radius
           along the star-planet axis.
        2. Rapid rotation (if tidally locked or pseudo-synchronized) causes
           centrifugal oblateness.
        3. Gravity darkening makes the equatorial regions dimmer than poles.

    The net effect is that the transit samples a larger effective stellar cross
    section, making the observed depth shallower than for a spherical star.

    Correction factor applied to R_p:
        R_p,corrected = R_p,observed × proximity_factor

    Returns:
        {
            "triggered": bool,
            "proximity_factor": float,
            "oblateness": float,
            "assessment": str,
        }
    """
    if period_days >= 1.5:
        return {
            "triggered": False,
            "proximity_factor": 1.0,
            "oblateness": 0.0,
            "assessment": "Period >= 1.5 days; no proximity correction needed.",
        }

    # Estimate planet mass if not provided
    if m_planet_jupiter is None:
        if r_planet_earth is not None and r_planet_earth > 0:
            m_planet_jupiter = _estimate_planet_mass_jupiter(r_planet_earth)
        else:
            m_planet_jupiter = 1.0  # default 1 M_Jup

    P_sec = period_days * 86400.0
    R_star = r_star_solar * R_SUN
    M_star = m_star_solar * M_SUN
    M_planet = m_planet_jupiter * 1.898e27  # kg

    # Semi-major axis
    a = ((G * M_star * P_sec ** 2) / (4.0 * math.pi ** 2)) ** (1.0 / 3.0)

    # ── Tidal oblateness ──
    # Roche distortion: ΔR/R ≈ (M_p / M_*) × (R_* / a)^3
    q = M_planet / max(M_star, 1.0)
    roche_distortion = q * (R_star / max(a, R_star * 2.0)) ** 3

    # ── Rotational oblateness ──
    # If pseudo-synchronized: Ω ≈ 2π/P
    omega = 2.0 * math.pi / P_sec
    # f_rot = Ω² R³ / (G M)
    f_rot = (omega ** 2 * R_star ** 3) / (G * M_star)

    total_oblateness = roche_distortion + f_rot

    # The transit depth is reduced by the oblateness because the effective
    # stellar cross section is larger (oblate → more area → shallower δ).
    # The correction factor for R_p scales as:
    #     R_p,true / R_p,observed ≈ (1 + oblateness)^(1/4)
    # This is because δ ∝ (R_p / R_eff)^2 and R_eff ≈ R_* × (1 + f)^(1/2)
    proximity_factor = (1.0 + total_oblateness) ** 0.25

    # Clamp to physically reasonable range
    proximity_factor = min(proximity_factor, 1.15)
    proximity_factor = max(proximity_factor, 1.0)

    return {
        "triggered": True,
        "proximity_factor": round(proximity_factor, 6),
        "oblateness": round(total_oblateness, 6),
        "roche_distortion": round(roche_distortion, 6),
        "rotational_oblateness": round(f_rot, 6),
        "estimated_m_planet_jup": round(m_planet_jupiter, 4),
        "a_over_rstar": round(a / R_star, 4) if R_star > 0 else None,
        "assessment": (
            f"Ultra-short period ({period_days:.4f}d) triggers proximity guard. "
            f"Tidal distortion ΔR/R = {roche_distortion:.6f}, "
            f"rotational oblateness f = {f_rot:.6f}. "
            f"Combined proximity correction factor = {proximity_factor:.4f}."
        ),
    }
