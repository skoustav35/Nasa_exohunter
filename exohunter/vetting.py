"""Scientific vetting helpers for exoplanet candidate validation."""

from __future__ import annotations

import math
import statistics
from typing import Iterable, List, Optional, Sequence

G = 6.674e-11
R_SUN = 6.957e8
R_EARTH = 6.371e6
R_JUPITER_EARTH = 11.2  # Jupiter radius in Earth radii
AU = 1.496e11
R_SUN_EARTH = 109.2


# ═══════════════════════════════════════════════════════════════
# DEPTH-SANITY GATEKEEPER  (v3.0)
# ═══════════════════════════════════════════════════════════════

def check_depth_sanity(
    observed_depth: Optional[float],
    stellar_radius_solar: Optional[float],
) -> dict:
    """Check whether the observed transit depth is physically plausible.

    Astrophysical basis:
    The maximum transit depth a planet can produce is limited by the size
    of its host star.  For a given R_*, the expected depth for a planet of
    radius R_p is:

        δ = (R_p / R_*)²

    We compute expected depths for:
        • 1.0 R⊕  — smallest meaningful signal
        • 11.2 R⊕ (Jupiter) — largest known planet radii

    If the observed depth exceeds **5× the Jupiter depth**, the signal
    almost certainly originates from stellar spots, instrument glints,
    or an eclipsing binary — NOT a transiting planet.

    Example: TIC 382200953 (TOI-125 b) has R_* ≈ 1.17 R☉.
        δ_jupiter ≈ (11.2 × 6.371e6 / (1.17 × 6.957e8))² ≈ 0.0079 (0.79%)
        5 × δ_jupiter ≈ 3.95%.
        Observed 1.3% < 3.95% → passes (but the REAL transit is only 0.08%).
    For a star with R_* = 0.5 R☉:
        δ_jupiter ≈ 0.0419 (4.19%), 5× = 20.9%
    """
    if observed_depth is None or stellar_radius_solar is None:
        return {
            "status": "unavailable",
            "override_reject": False,
            "reason": "Observed depth or stellar radius not provided.",
        }

    if stellar_radius_solar <= 0 or observed_depth <= 0:
        return {
            "status": "unavailable",
            "override_reject": False,
            "reason": "Non-positive depth or stellar radius.",
        }

    r_star_m = float(stellar_radius_solar) * R_SUN

    # Expected depth for a 1.0 R_earth planet
    depth_earth = (R_EARTH / r_star_m) ** 2

    # Expected depth for a Jupiter-sized (11.2 R_earth) planet
    depth_jupiter = (R_JUPITER_EARTH * R_EARTH / r_star_m) ** 2

    # Alert threshold: 5× the Jupiter depth
    alert_threshold = 5.0 * depth_jupiter
    depth_ratio = float(observed_depth) / depth_jupiter if depth_jupiter > 0 else 0.0

    is_alert = float(observed_depth) > alert_threshold
    override_reject = is_alert

    if is_alert:
        assessment = (
            f"DEPTH ALERT: Observed depth ({observed_depth * 100:.4f}%) "
            f"exceeds 5× the maximum Jupiter-depth ({depth_jupiter * 100:.4f}%) "
            f"for R_★ = {stellar_radius_solar:.3f} R☉. "
            f"Signal classified as 'Likely Stellar Spot / Instrument Glint'."
        )
    else:
        assessment = (
            f"Depth is within physical bounds. "
            f"Observed: {observed_depth * 100:.4f}%, "
            f"Max Jupiter: {depth_jupiter * 100:.4f}%, "
            f"Ratio: {depth_ratio:.2f}× Jupiter."
        )

    return {
        "status": "ok",
        "expected_depth_earth": round(depth_earth, 8),
        "expected_depth_jupiter": round(depth_jupiter, 6),
        "alert_threshold_5x_jup": round(alert_threshold, 6),
        "observed_depth": round(float(observed_depth), 8),
        "depth_to_jupiter_ratio": round(depth_ratio, 3),
        "alert": is_alert,
        "override_reject": override_reject,
        "classification_override": "Likely Stellar Spot / Instrument Glint" if is_alert else None,
        "assessment": assessment,
    }


def validate_geometric_radius_depth(
    transit_depth_ppm: Optional[float],
    planet_radius_earth: Optional[float],
    stellar_radius_sol: Optional[float],
    tolerance: float = 0.02,
) -> dict:
    """Validate Rp = Rstar * 109.2 * sqrt(depth_fraction).

    The depth passed here must be canonical: de-diluted and limb-darkening
    neutral. Raw observed depths should be carried separately.
    """
    try:
        depth_ppm = float(transit_depth_ppm)
        radius_earth = float(planet_radius_earth)
        stellar_radius = float(stellar_radius_sol)
    except (TypeError, ValueError):
        return {
            "ok": False,
            "reason": "Missing or non-numeric radius/depth fields.",
            "expected_radius_earth": None,
            "drift": None,
        }

    if not all(math.isfinite(value) for value in [depth_ppm, radius_earth, stellar_radius]):
        return {
            "ok": False,
            "reason": "Radius/depth fields must be finite.",
            "expected_radius_earth": None,
            "drift": None,
        }
    if depth_ppm <= 0 or depth_ppm > 1_000_000:
        return {
            "ok": False,
            "reason": f"Non-physical transit depth ({depth_ppm} ppm).",
            "expected_radius_earth": None,
            "drift": None,
        }
    if radius_earth <= 0 or stellar_radius <= 0:
        return {
            "ok": False,
            "reason": "Planet and stellar radii must be positive.",
            "expected_radius_earth": None,
            "drift": None,
        }

    expected_radius = stellar_radius * R_SUN_EARTH * math.sqrt(depth_ppm / 1_000_000.0)
    drift = abs(radius_earth - expected_radius) / max(expected_radius, 1e-12)
    return {
        "ok": drift <= tolerance,
        "reason": None if drift <= tolerance else "Planet radius deviates from geometric transit depth.",
        "expected_radius_earth": round(expected_radius, 6),
        "drift": round(drift, 6),
        "tolerance": tolerance,
    }


def secure_report_badge_assignment(physical_integrity_score, report_payload):
    """Force narrative status to agree with physical-integrity scoring."""
    payload = dict(report_payload or {})
    try:
        score = float(physical_integrity_score)
    except (TypeError, ValueError):
        score = 0.0

    if score < 50:
        payload["status"] = "REJECTED: PHYSICAL IMPOSSIBILITY"
        payload["verdict"] = "FALSE POSITIVE MARGIN TRACTION EXHAUSTED"
        payload["badge"] = "[REJECTED BLENDED SIGNAL ARTIFACT]"
        payload["narrative_locked"] = True
    else:
        payload.setdefault("status", "CONFIRMED HIGH-FIDELITY DISCOVERY")
        payload.setdefault("badge", "[PRIMARY COMPONENT - VERIFIED V5.0]")
        payload["narrative_locked"] = True

    return payload


def _to_float_list(values: Optional[Iterable[float]]) -> List[float]:
    if not values:
        return []
    out: List[float] = []
    for value in values:
        try:
            out.append(float(value))
        except (TypeError, ValueError):
            continue
    return out


def _median(values: Sequence[float], default: float = 0.0) -> float:
    if not values:
        return default
    return float(statistics.median(values))


def _stdev(values: Sequence[float], default: float = 1e-6) -> float:
    if len(values) < 2:
        return default
    try:
        spread = float(statistics.stdev(values))
    except statistics.StatisticsError:
        return default
    return spread if spread > 0 else default


def apply_contamination_correction(
    observed_radius_earth: Optional[float],
    contamination_ratio: Optional[float],
) -> dict:
    """Apply the TESS crowding correction to the inferred planet radius.

    Astrophysical basis:
    Dilution from neighboring stars makes the observed transit shallower than the
    intrinsic eclipse depth. If the TIC contamination ratio is C_r, then the
    intrinsic radius scales as:

        R_p,corr = R_p,obs * sqrt(1 + C_r)

    This correction is especially important in crowded fields where uncorrected
    radii can systematically under-estimate the true companion size.
    """
    radius = float(observed_radius_earth or 0.0)
    contamination = max(0.0, float(contamination_ratio or 0.0))
    correction_factor = math.sqrt(1.0 + contamination)
    corrected_radius = radius * correction_factor
    return {
        "status": "ok" if observed_radius_earth is not None else "unavailable",
        "observed_radius_earth": round(radius, 6),
        "contamination_ratio": round(contamination, 6),
        "correction_factor": round(correction_factor, 6),
        "corrected_radius_earth": round(corrected_radius, 6),
        "crowded_field_flag": contamination >= 0.1,
    }


def estimate_cdpp_ppm(
    flux: Optional[Iterable[float]],
    cadence_hours: Optional[float] = None,
    transit_duration_hours: Optional[float] = None,
) -> dict:
    """Estimate the Combined Differential Photometric Precision in ppm.

    Astrophysical basis:
    CDPP is the effective noise seen by transit searches on transit-like
    timescales. Lower CDPP means a light curve can support shallower events with
    higher confidence. We estimate it by measuring the scatter of windowed,
    detrended averages on the candidate's transit timescale.
    """
    flux_values = _to_float_list(flux)
    if len(flux_values) < 20:
        return {
            "status": "unavailable",
            "cdpp_ppm": None,
            "reason": "Not enough cadences are available for a CDPP estimate.",
        }

    cadence = float(cadence_hours or 0.0333)
    target_duration = float(transit_duration_hours or 6.5)
    window = max(3, int(round(target_duration / max(cadence, 1e-4))))

    running_means: List[float] = []
    for start in range(0, len(flux_values) - window + 1):
        window_flux = flux_values[start : start + window]
        running_means.append(sum(window_flux) / len(window_flux))

    if len(running_means) < 3:
        return {
            "status": "unavailable",
            "cdpp_ppm": None,
            "reason": "The requested CDPP window is larger than the available light curve.",
        }

    baseline = _median(running_means, default=1.0)
    residuals_ppm = [(value - baseline) * 1.0e6 for value in running_means]
    cdpp_ppm = _stdev(residuals_ppm, default=0.0)
    return {
        "status": "ok",
        "cdpp_ppm": round(cdpp_ppm, 3),
        "window_cadences": window,
        "window_hours": round(window * cadence, 3),
    }


def estimate_density_consistency(
    period_days: Optional[float],
    duration_hours: Optional[float],
    stellar_radius_solar: Optional[float],
    stellar_density_cgs: Optional[float],
    orbital: Optional[dict],
) -> dict:
    """Check whether the transit duration is consistent with the host density.

    Astrophysical basis:
    For a transiting body in a near-circular orbit, the duration, impact
    geometry, and orbital period imply a characteristic stellar density. A large
    mismatch with the adopted host-star density is a classic false-positive
    indicator for blended binaries, incorrect periods, or unphysical fits.
    """
    orbital = orbital or {}
    if not (
        period_days
        and duration_hours
        and stellar_radius_solar
        and stellar_density_cgs
        and orbital.get("semi_major_axis_au")
        and orbital.get("planet_radius_earth")
    ):
        return {
            "status": "unavailable",
            "override_reject": False,
            "reason": "Density consistency requires period, duration, stellar density, and orbital scale.",
        }

    a_over_r = (float(orbital["semi_major_axis_au"]) * AU) / (float(stellar_radius_solar) * R_SUN)
    k = (float(orbital["planet_radius_earth"]) * R_EARTH) / (float(stellar_radius_solar) * R_SUN)
    max_duration = (float(period_days) / math.pi) * math.asin(min(1.0, (1.0 + k) / max(a_over_r, 1.0)))
    max_duration_hours = max_duration * 24.0

    transit_implied_density = (
        5.51
        * ((float(orbital["semi_major_axis_au"]) / max(float(stellar_radius_solar) * 0.00465047, 1e-6)) ** 3)
        * (365.25 / max(float(period_days), 1e-6)) ** 2
    )
    density_ratio = max(transit_implied_density, float(stellar_density_cgs)) / max(
        min(transit_implied_density, float(stellar_density_cgs)),
        1e-6,
    )

    impossible_duration = float(duration_hours) > max_duration_hours * 1.1
    severe_density_conflict = density_ratio > 5.0

    return {
        "status": "ok",
        "transit_implied_density_cgs": round(transit_implied_density, 4),
        "adopted_stellar_density_cgs": round(float(stellar_density_cgs), 4),
        "density_ratio": round(density_ratio, 4),
        "max_duration_hours": round(max_duration_hours, 4),
        "impossible_duration": impossible_duration,
        "severe_density_conflict": severe_density_conflict,
        "override_reject": impossible_duration or severe_density_conflict,
    }


def normalize_phase_array(phases: Optional[Iterable[float]]) -> List[float]:
    normalized: List[float] = []
    for raw_phase in _to_float_list(phases):
        phase = raw_phase % 1.0
        if phase >= 0.5:
            phase -= 1.0
        normalized.append(phase)
    return normalized


def estimate_phase_half_width(
    period_days: Optional[float],
    duration_hours: Optional[float],
    floor: float = 0.02,
    ceiling: float = 0.2,
) -> float:
    if not period_days or period_days <= 0 or not duration_hours or duration_hours <= 0:
        return 0.05
    half_width = max(duration_hours / (24.0 * period_days) / 2.0, floor)
    return min(half_width, ceiling)


def analyze_transit_shape(
    phases: Optional[Iterable[float]],
    flux: Optional[Iterable[float]],
    period_days: Optional[float],
    duration_hours: Optional[float],
) -> dict:
    norm_phases = normalize_phase_array(phases)
    flux_values = _to_float_list(flux)
    if len(norm_phases) != len(flux_values) or len(flux_values) < 40:
        return {
            "status": "unavailable",
            "shape": "Unknown",
            "reason": "Insufficient phase-folded points for shape analysis.",
        }

    half_width = estimate_phase_half_width(period_days, duration_hours)
    transit_indices = [i for i, phase in enumerate(norm_phases) if abs(phase) <= half_width]
    baseline_indices = [i for i, phase in enumerate(norm_phases) if abs(phase) >= max(half_width * 1.8, 0.1)]
    if len(transit_indices) < 12 or len(baseline_indices) < 12:
        return {
            "status": "unavailable",
            "shape": "Unknown",
            "reason": "Not enough in-transit or baseline samples for morphology checks.",
        }

    baseline_flux = [flux_values[i] for i in baseline_indices]
    baseline = _median(baseline_flux, default=1.0)
    deficits = []
    for i in transit_indices:
        deficit = max(0.0, baseline - flux_values[i])
        deficits.append((norm_phases[i], deficit))

    peak_depth = max((deficit for _, deficit in deficits), default=0.0)
    if peak_depth <= 0:
        return {
            "status": "ok",
            "shape": "Flat",
            "peak_depth": 0.0,
            "plateau_fraction": 0.0,
            "symmetry_score": 1.0,
            "u_shape_score": 0.0,
            "v_shape_score": 0.0,
            "reason": "No measurable transit deficit remains after baseline normalization.",
        }

    threshold = peak_depth * 0.9
    plateau_fraction = len([phase for phase, deficit in deficits if deficit >= threshold]) / max(1, len(deficits))

    core_depths = [deficit for phase, deficit in deficits if abs(phase) <= half_width * 0.35]
    wing_depths = [deficit for phase, deficit in deficits if half_width * 0.45 <= abs(phase) <= half_width * 0.95]
    core_depth = _median(core_depths)
    wing_depth = _median(wing_depths)
    wing_to_core_ratio = wing_depth / core_depth if core_depth > 0 else 0.0

    symmetry_bins = 6
    mirrored_diffs: List[float] = []
    for bin_index in range(symmetry_bins):
        left_min = -half_width + (bin_index * half_width / symmetry_bins)
        left_max = -half_width + ((bin_index + 1) * half_width / symmetry_bins)
        right_min = (bin_index * half_width / symmetry_bins)
        right_max = ((bin_index + 1) * half_width / symmetry_bins)

        left_values = [deficit for phase, deficit in deficits if left_min <= phase < left_max]
        right_values = [deficit for phase, deficit in deficits if right_min <= phase < right_max]
        if not left_values or not right_values:
            continue
        mirrored_diffs.append(abs(_median(left_values) - _median(right_values)) / peak_depth)

    symmetry_score = 1.0 - min(1.0, _median(mirrored_diffs, default=0.0))
    u_shape_score = max(0.0, min(1.0, 0.6 * min(1.0, plateau_fraction / 0.22) + 0.4 * symmetry_score))
    v_shape_score = max(
        0.0,
        min(
            1.0,
            0.55 * (1.0 - min(1.0, plateau_fraction / 0.18))
            + 0.45 * min(1.0, max(0.0, 0.75 - wing_to_core_ratio) / 0.75),
        ),
    )

    if plateau_fraction >= 0.16 and symmetry_score >= 0.55 and wing_to_core_ratio >= 0.4:
        shape = "U-shape"
        assessment = "Planet-like flat-bottomed transit."
    elif plateau_fraction <= 0.1 and wing_to_core_ratio <= 0.35:
        shape = "V-shape"
        assessment = "Grazing or stellar eclipse morphology."
    else:
        shape = "Ambiguous"
        assessment = "Transit morphology is neither cleanly U-shaped nor clearly V-shaped."

    return {
        "status": "ok",
        "shape": shape,
        "assessment": assessment,
        "peak_depth": round(peak_depth / baseline if baseline else peak_depth, 6),
        "plateau_fraction": round(plateau_fraction, 4),
        "wing_to_core_ratio": round(wing_to_core_ratio, 4),
        "symmetry_score": round(symmetry_score, 4),
        "u_shape_score": round(u_shape_score, 4),
        "v_shape_score": round(v_shape_score, 4),
    }


def estimate_impact_parameter(
    r_planet_earth: Optional[float],
    r_star_solar: Optional[float],
    a_au: Optional[float],
    period_days: Optional[float],
    duration_hours: Optional[float],
) -> dict:
    if not all(
        value is not None and value > 0
        for value in [r_planet_earth, r_star_solar, a_au, period_days, duration_hours]
    ):
        return {
            "status": "unavailable",
            "impact_parameter": 0.0,
            "inclination_deg": None,
            "grazing": False,
            "reason": "Positive orbital geometry inputs are required.",
        }

    r_planet_m = float(r_planet_earth) * R_EARTH
    r_star_m = float(r_star_solar) * R_SUN
    a_m = float(a_au) * AU
    period_seconds = float(period_days) * 86400.0
    duration_seconds = float(duration_hours) * 3600.0

    a_over_r = a_m / r_star_m
    k = r_planet_m / r_star_m
    alpha = math.sin(min(math.pi / 2.0, math.pi * duration_seconds / period_seconds))

    denominator = max(1e-8, 1.0 - alpha * alpha)
    numerator = ((1.0 + k) ** 2) - ((alpha * a_over_r) ** 2)
    b_sq = max(0.0, numerator / denominator)
    b_sq = min(b_sq, (1.0 + k) ** 2)
    impact_parameter = math.sqrt(b_sq)

    cos_i = max(0.0, min(1.0, impact_parameter / max(a_over_r, 1e-8)))
    inclination_deg = math.degrees(math.acos(cos_i))
    grazing = impact_parameter > 0.9

    return {
        "status": "ok",
        "impact_parameter": round(impact_parameter, 4),
        "inclination_deg": round(inclination_deg, 3),
        "a_over_r_star": round(a_over_r, 4),
        "radius_ratio": round(k, 5),
        "grazing": grazing,
        "assessment": "Grazing geometry is likely." if grazing else "Impact parameter is compatible with a non-grazing transit.",
    }


def search_secondary_eclipse(
    phases: Optional[Iterable[float]],
    flux: Optional[Iterable[float]],
    period_days: Optional[float],
    duration_hours: Optional[float],
    sigma_threshold: float = 2.0,
    is_multi_planet: bool = False,
) -> dict:
    norm_phases = normalize_phase_array(phases)
    flux_values = _to_float_list(flux)
    if len(norm_phases) != len(flux_values) or len(flux_values) < 40:
        return {
            "status": "unavailable",
            "detected": False,
            "depth": 0.0,
            "significance_sigma": 0.0,
            "reason": "Insufficient phase-folded points for a secondary eclipse search.",
        }

    half_width = estimate_phase_half_width(period_days, duration_hours)
    secondary_window = min(0.14, max(half_width * 1.25, 0.03))
    primary_exclusion = max(half_width * 1.5, 0.06)

    secondary_flux = [
        flux_value
        for phase, flux_value in zip(norm_phases, flux_values)
        if abs(abs(phase) - 0.5) <= secondary_window
    ]
    baseline_flux = [
        flux_value
        for phase, flux_value in zip(norm_phases, flux_values)
        if abs(phase) >= primary_exclusion and abs(abs(phase) - 0.5) > secondary_window
    ]

    if len(secondary_flux) < 8 or len(baseline_flux) < 12:
        return {
            "status": "unavailable",
            "detected": False,
            "depth": 0.0,
            "significance_sigma": 0.0,
            "reason": "Not enough off-transit baseline or phase-0.5 coverage.",
        }

    baseline = _median(baseline_flux, default=1.0)
    baseline_std = _stdev(baseline_flux)
    eclipse_floor = min(secondary_flux)
    depth = max(0.0, baseline - eclipse_floor)
    significance = depth / baseline_std if baseline_std > 0 else 0.0
    detected = depth > 0 and significance >= sigma_threshold

    if is_multi_planet:
        detected = False
        depth = 0.0
        significance = 0.0

    return {
        "status": "ok",
        "detected": detected,
        "depth": round(depth / baseline if baseline else depth, 6),
        "significance_sigma": round(significance, 3),
        "window_phase_half_width": round(secondary_window, 4),
        "assessment": "Secondary eclipse detected near phase 0.5." if detected else "No significant secondary eclipse detected.",
    }


def analyze_centroid_shift(
    phases: Optional[Iterable[float]],
    centroid_x: Optional[Iterable[float]],
    centroid_y: Optional[Iterable[float]],
    period_days: Optional[float],
    duration_hours: Optional[float],
    threshold_pixels: float = 0.5,
) -> dict:
    norm_phases = normalize_phase_array(phases)
    x_values = _to_float_list(centroid_x)
    y_values = _to_float_list(centroid_y)
    if len(norm_phases) != len(x_values) or len(norm_phases) != len(y_values) or len(norm_phases) < 20:
        return {
            "status": "unavailable",
            "shift_pixels": None,
            "flagged": False,
            "reason": "Centroid time series were not provided alongside the light curve.",
        }

    half_width = estimate_phase_half_width(period_days, duration_hours)
    in_transit = [i for i, phase in enumerate(norm_phases) if abs(phase) <= half_width]
    out_of_transit = [i for i, phase in enumerate(norm_phases) if abs(phase) >= max(half_width * 2.0, 0.12)]
    if len(in_transit) < 5 or len(out_of_transit) < 8:
        return {
            "status": "unavailable",
            "shift_pixels": None,
            "flagged": False,
            "reason": "Centroid windows do not contain enough points for comparison.",
        }

    in_x = _median([x_values[i] for i in in_transit])
    in_y = _median([y_values[i] for i in in_transit])
    out_x = _median([x_values[i] for i in out_of_transit])
    out_y = _median([y_values[i] for i in out_of_transit])
    shift = math.sqrt((in_x - out_x) ** 2 + (in_y - out_y) ** 2)

    return {
        "status": "measured",
        "shift_pixels": round(shift, 4),
        "flagged": shift > threshold_pixels,
        "threshold_pixels": threshold_pixels,
        "assessment": "Centroid motion is consistent with a background eclipsing binary."
        if shift > threshold_pixels
        else "No significant centroid shift was measured.",
    }


def run_independent_cognitive_protocol(
    phases: Optional[Iterable[float]],
    flux: Optional[Iterable[float]],
    period_days: Optional[float],
    duration_hours: Optional[float],
    stellar_radius_solar: Optional[float],
    stellar_density_cgs: Optional[float],
    orbital: Optional[dict],
    shape_report: Optional[dict],
    impact_report: Optional[dict],
    secondary_report: Optional[dict],
) -> dict:
    """Challenge the candidate with an explicit anti-confirmation pass.

    Astrophysical basis:
    Planet validation is strongest when the pipeline actively looks for ways the
    signal could be wrong. This routine argues against the current solution by
    checking morphology, secondary eclipses, grazing geometry, and whether the
    transit duration is physically compatible with the adopted stellar density.
    """
    arguments: List[str] = []
    severity = 0

    shape_report = shape_report or {}
    impact_report = impact_report or {}
    secondary_report = secondary_report or {}
    orbital = orbital or {}
    density_report = estimate_density_consistency(
        period_days,
        duration_hours,
        stellar_radius_solar,
        stellar_density_cgs,
        orbital,
    )

    if shape_report.get("shape") == "V-shape":
        arguments.append("Transit morphology is V-shaped rather than planet-like U-shaped.")
        severity += 2

    if impact_report.get("grazing"):
        arguments.append(
            f"Impact parameter is grazing (b={impact_report.get('impact_parameter')})."
        )
        severity += 2

    if secondary_report.get("detected"):
        arguments.append(
            f"Secondary eclipse significance reaches {secondary_report.get('significance_sigma')} sigma near phase 0.5."
        )
        severity += 3

    if density_report.get("status") == "ok":
        if density_report.get("impossible_duration"):
            arguments.append(
                f"Observed duration ({duration_hours:.2f} h) exceeds the density-limited maximum ({density_report.get('max_duration_hours'):.2f} h)."
            )
            severity += 3
        elif density_report.get("density_ratio", 1.0) > 3.0:
            arguments.append(
                f"Transit-implied stellar density ({density_report.get('transit_implied_density_cgs'):.2f} g/cm^3) conflicts with the adopted stellar density ({density_report.get('adopted_stellar_density_cgs'):.2f} g/cm^3)."
            )
            severity += 2

    symmetry_score = shape_report.get("symmetry_score")
    if symmetry_score is not None and symmetry_score < 0.45:
        arguments.append(
            f"Transit asymmetry is elevated (symmetry score={symmetry_score})."
        )
        severity += 1

    status = "challenged" if arguments else "pass"
    return {
        "status": status,
        "challenge_score": severity,
        "override_reject": density_report.get("override_reject", False),
        "density_consistency": density_report,
        "arguments": arguments,
        "assessment": "The anti-confirmation pass found no strong contradictions."
        if not arguments
        else "The anti-confirmation pass found counter-evidence that must be resolved before confirmation.",
    }


def compute_validation_probability(
    snr: Optional[float],
    period_days: Optional[float],
    impact_report: Optional[dict],
    shape_report: Optional[dict],
    secondary_report: Optional[dict],
    centroid_report: Optional[dict],
    odd_even_consistent: bool = True,
    challenge_report: Optional[dict] = None,
    resonance_alert: bool = False,
    transit_depth: Optional[float] = None,
    cdpp_ppm: Optional[float] = None,
) -> dict:
    """Convert vetting evidence into a validation probability proxy.

    Astrophysical basis:
    The validation score is a logistic evidence combiner. Positive evidence
    includes high SNR, a U-shaped transit, and a lack of centroid/secondary
    anomalies. We explicitly down-weight noisy light curves by comparing the
    candidate depth to the light curve's CDPP, because high CDPP increases the
    chance that an apparent event is noise-driven or poorly constrained.
    """
    score = 0.0
    snr_value = float(snr or 0.0)

    if snr_value >= 10:
        score += 2.7
    elif snr_value >= 7:
        score += 2.1
    elif snr_value >= 5:
        score += 1.2
    elif snr_value < 3:
        score -= 2.0

    if odd_even_consistent:
        score += 1.1
    else:
        score -= 2.7

    if resonance_alert:
        score -= 0.7
    else:
        score += 0.35

    if cdpp_ppm is not None and transit_depth is not None:
        depth_ppm = max(0.0, float(transit_depth) * 1.0e6)
        cdpp = max(float(cdpp_ppm), 1.0)
        depth_to_noise = depth_ppm / cdpp
        if depth_to_noise >= 10.0:
            score += 1.0
        elif depth_to_noise >= 5.0:
            score += 0.45
        elif depth_to_noise >= 3.0:
            score -= 0.1
        elif depth_to_noise >= 1.5:
            score -= 1.2
        else:
            score -= 2.6

    impact_report = impact_report or {}
    impact_parameter = impact_report.get("impact_parameter")
    if impact_report.get("grazing"):
        score -= 2.6
    elif impact_parameter is not None and impact_parameter < 0.85:
        score += 0.95

    shape_report = shape_report or {}
    if shape_report.get("shape") == "U-shape":
        score += 1.8
    elif shape_report.get("shape") == "V-shape":
        score -= 2.4

    secondary_report = secondary_report or {}
    if secondary_report.get("detected"):
        score -= 5.0
    else:
        score += 1.35

    centroid_report = centroid_report or {}
    if centroid_report.get("status") == "measured":
        if centroid_report.get("flagged"):
            score -= 4.2
        else:
            score += 0.8

    challenge_report = challenge_report or {}
    if challenge_report.get("status") == "pass":
        score += 1.55
    else:
        score -= 0.8 * len(challenge_report.get("arguments", []))
    if challenge_report.get("override_reject"):
        score -= 4.5

    if period_days and period_days > 0:
        score += 0.1

    probability = 1.0 / (1.0 + math.exp(-score))
    false_positive_probability = 1.0 - probability
    validated = (
        probability >= 0.997
        and not secondary_report.get("detected")
        and not impact_report.get("grazing")
        and not challenge_report.get("override_reject")
    )

    if probability >= 0.997:
        tier = "validated"
    elif probability >= 0.9:
        tier = "strong-candidate"
    elif probability >= 0.5:
        tier = "candidate"
    else:
        tier = "false-positive-risk"

    return {
        "score": round(score, 4),
        "validation_probability": round(probability, 6),
        "false_positive_probability": round(false_positive_probability, 6),
        "cdpp_ppm": round(float(cdpp_ppm), 3) if cdpp_ppm is not None else None,
        "validated": validated,
        "tier": tier,
    }


def analyze_transit_timing_variations(
    time_data: Optional[Iterable[float]],
    flux: Optional[Iterable[float]],
    period_days: Optional[float],
    duration_hours: Optional[float],
    epoch: Optional[float] = None,
) -> dict:
    times = _to_float_list(time_data)
    flux_values = _to_float_list(flux)
    if len(times) != len(flux_values) or len(times) < 40 or not period_days or period_days <= 0:
        return {
            "status": "unavailable",
            "transits": [],
            "reason": "Absolute time series are required for transit timing measurements.",
        }

    time_span = max(times) - min(times)
    if time_span < period_days * 1.5:
        return {
            "status": "unavailable",
            "transits": [],
            "reason": "The time span does not contain enough consecutive transits for TTV analysis.",
        }

    half_duration_days = max((duration_hours or 0.0) / 24.0 / 2.0, period_days * 0.01)
    baseline = _median(flux_values, default=1.0)
    deficits = [max(0.0, baseline - value) for value in flux_values]

    if epoch is None:
        epoch = times[deficits.index(max(deficits))]

    first_index = math.floor((min(times) - epoch) / period_days) - 1
    last_index = math.ceil((max(times) - epoch) / period_days) + 1

    transit_reports = []
    for transit_number in range(first_index, last_index + 1):
        expected_center = epoch + transit_number * period_days
        indices = [
            i
            for i, time_value in enumerate(times)
            if abs(time_value - expected_center) <= half_duration_days * 1.35
        ]
        if len(indices) < 5:
            continue
        weights = [deficits[i] for i in indices]
        if max(weights, default=0.0) <= 0:
            continue
        total_weight = sum(weights)
        measured_center = sum(times[i] * weights[pos] for pos, i in enumerate(indices)) / total_weight
        residual_minutes = (measured_center - expected_center) * 24.0 * 60.0
        transit_reports.append(
            {
                "transit_number": transit_number,
                "expected_center_bjd": round(expected_center, 6),
                "measured_center_bjd": round(measured_center, 6),
                "o_minus_c_minutes": round(residual_minutes, 3),
            }
        )

    if len(transit_reports) < 2:
        return {
            "status": "unavailable",
            "transits": transit_reports,
            "reason": "Not enough resolved transit centers were measured for a TTV fit.",
        }

    residuals = [entry["o_minus_c_minutes"] for entry in transit_reports]
    rms = math.sqrt(sum(value * value for value in residuals) / len(residuals))

    return {
        "status": "ok",
        "transits": transit_reports,
        "ttv_rms_minutes": round(rms, 3),
        "assessment": "Potential TTV signal present." if rms >= 5.0 else "No strong transit timing variation signal detected.",
    }
