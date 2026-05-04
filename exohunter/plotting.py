"""Plot helpers for publication-ready phase-folded light curves."""

from __future__ import annotations

import os
import statistics
from typing import Iterable, List, Optional

try:
    import numpy as np
except Exception:  # pragma: no cover - optional dependency guard
    np = None

from exohunter.vetting import estimate_phase_half_width, normalize_phase_array


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


def generate_phase_folded_plot(
    tic_id: str,
    phases: Optional[Iterable[float]],
    flux: Optional[Iterable[float]],
    output_dir: str = "plots",
    period_days: Optional[float] = None,
    snr: Optional[float] = None,
    classification: Optional[str] = None,
) -> Optional[str]:
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception:
        return None

    phase_values = normalize_phase_array(phases)
    flux_values = _to_float_list(flux)
    if len(phase_values) != len(flux_values) or len(flux_values) < 10:
        return None

    paired = sorted(zip(phase_values, flux_values), key=lambda item: item[0])
    phase_values = [item[0] for item in paired]
    flux_values = [item[1] for item in paired]

    bins = 75
    binned_x: List[float] = []
    binned_y: List[float] = []
    for bin_index in range(bins):
        left = -0.5 + (bin_index / bins)
        right = -0.5 + ((bin_index + 1) / bins)
        bin_flux = [flux_value for phase, flux_value in paired if left <= phase < right]
        if not bin_flux:
            continue
        binned_x.append((left + right) / 2.0)
        binned_y.append(float(statistics.median(bin_flux)))

    os.makedirs(output_dir, exist_ok=True)
    filename = os.path.join(output_dir, f"TIC_{tic_id}_phase_folded.png")

    plt.figure(figsize=(10, 5.4))
    plt.scatter(phase_values, flux_values, s=8, alpha=0.35, c="#1f2937", edgecolors="none", label="Cadence")
    if binned_x:
        plt.plot(binned_x, binned_y, color="#d97706", linewidth=2.2, label="Median bins")
    plt.axvline(0.0, color="#2563eb", linestyle="--", linewidth=1.2, alpha=0.7, label="Primary transit")
    plt.axvline(-0.5, color="#dc2626", linestyle=":", linewidth=1.1, alpha=0.55, label="Secondary search")
    plt.axvline(0.5, color="#dc2626", linestyle=":", linewidth=1.1, alpha=0.55)

    title_parts = [f"TIC {tic_id}", "Phase-Folded Light Curve"]
    if classification:
        title_parts.append(classification)
    if period_days:
        title_parts.append(f"P={period_days:.5f} d")
    if snr is not None:
        title_parts.append(f"SNR={snr:.2f}")
    plt.title(" | ".join(title_parts))
    plt.xlabel("Orbital Phase")
    plt.ylabel("Normalized Flux")
    plt.grid(alpha=0.2)
    plt.legend(loc="best")
    plt.tight_layout()
    plt.savefig(filename, dpi=160)
    plt.close()
    return filename


def generate_difference_image(
    tic_id: str,
    phases: Optional[Iterable[float]],
    flux: Optional[Iterable[float]],
    centroid_x: Optional[Iterable[float]],
    centroid_y: Optional[Iterable[float]],
    output_dir: str = "plots",
    period_days: Optional[float] = None,
    duration_hours: Optional[float] = None,
    target_x: float = 0.0,
    target_y: float = 0.0,
) -> dict:
    """Build a simplified difference image from in-transit and baseline samples.

    Astrophysical basis:
    Difference imaging subtracts the in-transit scene from the out-of-transit
    scene. If the resulting flux deficit is centered on the target star, the
    transit likely belongs to the target. If the hole is offset toward a
    neighbor, the signal is more consistent with a blended eclipsing binary.
    """
    phase_values = normalize_phase_array(phases)
    flux_values = _to_float_list(flux)
    x_values = _to_float_list(centroid_x)
    y_values = _to_float_list(centroid_y)

    if not (
        len(phase_values) == len(flux_values) == len(x_values) == len(y_values)
        and len(phase_values) >= 20
    ):
        return {
            "status": "unavailable",
            "path": None,
            "assessment": "Difference imaging requires phase, flux, and centroid time series of equal length.",
        }

    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception:
        return {
            "status": "unavailable",
            "path": None,
            "assessment": "matplotlib is unavailable, so the difference image could not be rendered.",
        }

    half_width = estimate_phase_half_width(period_days, duration_hours)
    in_transit = [index for index, phase in enumerate(phase_values) if abs(phase) <= half_width]
    out_of_transit = [index for index, phase in enumerate(phase_values) if abs(phase) >= max(half_width * 2.0, 0.12)]
    if len(in_transit) < 5 or len(out_of_transit) < 8:
        return {
            "status": "unavailable",
            "path": None,
            "assessment": "Difference imaging needs both in-transit and out-of-transit cadences.",
        }

    baseline = float(statistics.median([flux_values[index] for index in out_of_transit]))
    weights = [max(0.0, baseline - flux_values[index]) for index in in_transit]
    if max(weights, default=0.0) <= 0:
        return {
            "status": "unavailable",
            "path": None,
            "assessment": "No in-transit flux deficit remained for difference imaging.",
        }

    total_weight = sum(weights)
    hole_x = sum(x_values[index] * weights[pos] for pos, index in enumerate(in_transit)) / total_weight
    hole_y = sum(y_values[index] * weights[pos] for pos, index in enumerate(in_transit)) / total_weight
    offset_pixels = ((hole_x - target_x) ** 2 + (hole_y - target_y) ** 2) ** 0.5
    centered = offset_pixels <= 0.5

    if np is not None:
        x_all = np.asarray(x_values, dtype=float)
        y_all = np.asarray(y_values, dtype=float)
        in_weights = np.asarray([max(0.0, baseline - flux_values[index]) for index in in_transit], dtype=float)
        if len(in_weights) == 0:
            in_weights = np.ones(len(in_transit), dtype=float)
        bins = 25
        x_min = min(x_values) - 1.0
        x_max = max(x_values) + 1.0
        y_min = min(y_values) - 1.0
        y_max = max(y_values) + 1.0
        out_hist, xedges, yedges = np.histogram2d(
            x_all[out_of_transit],
            y_all[out_of_transit],
            bins=bins,
            range=[[x_min, x_max], [y_min, y_max]],
        )
        in_hist, _, _ = np.histogram2d(
            x_all[in_transit],
            y_all[in_transit],
            bins=bins,
            range=[[x_min, x_max], [y_min, y_max]],
            weights=in_weights,
        )
        difference = out_hist - in_hist
    else:
        bins = 25
        x_min = min(x_values) - 1.0
        x_max = max(x_values) + 1.0
        y_min = min(y_values) - 1.0
        y_max = max(y_values) + 1.0
        difference = [[0.0 for _ in range(bins)] for _ in range(bins)]
        x_span = max(x_max - x_min, 1e-6)
        y_span = max(y_max - y_min, 1e-6)
        for index in out_of_transit:
            xi = min(bins - 1, int(((x_values[index] - x_min) / x_span) * bins))
            yi = min(bins - 1, int(((y_values[index] - y_min) / y_span) * bins))
            difference[xi][yi] += 1.0
        for pos, index in enumerate(in_transit):
            xi = min(bins - 1, int(((x_values[index] - x_min) / x_span) * bins))
            yi = min(bins - 1, int(((y_values[index] - y_min) / y_span) * bins))
            difference[xi][yi] -= weights[pos]

    os.makedirs(output_dir, exist_ok=True)
    filename = os.path.join(output_dir, f"TIC_{tic_id}_difference_image.png")

    plt.figure(figsize=(6.4, 5.6))
    plt.imshow(difference, origin="lower", cmap="coolwarm", aspect="auto")
    plt.colorbar(label="Out-of-transit minus in-transit signal")
    plt.scatter(
        [(target_x - x_min) / max(x_max - x_min, 1e-6) * (bins - 1)],
        [(target_y - y_min) / max(y_max - y_min, 1e-6) * (bins - 1)],
        c="white",
        marker="+",
        s=140,
        linewidths=1.8,
        label="Target",
    )
    plt.scatter(
        [(hole_x - x_min) / max(x_max - x_min, 1e-6) * (bins - 1)],
        [(hole_y - y_min) / max(y_max - y_min, 1e-6) * (bins - 1)],
        c="black",
        marker="x",
        s=90,
        linewidths=1.8,
        label="Difference hole",
    )
    plt.title(f"TIC {tic_id} Difference Image")
    plt.xlabel("Detector X bin")
    plt.ylabel("Detector Y bin")
    plt.legend(loc="best")
    plt.tight_layout()
    plt.savefig(filename, dpi=160)
    plt.close()

    return {
        "status": "success",
        "path": filename,
        "hole_x": round(hole_x, 4),
        "hole_y": round(hole_y, 4),
        "offset_pixels": round(offset_pixels, 4),
        "centered_on_target": centered,
        "classification": "Target-centered transit source" if centered else "Offset source: possible BEB",
    }


def generate_ttv_oc_plot(
    tic_id: str,
    transits: Optional[Iterable[dict]],
    output_dir: str = "plots",
) -> Optional[str]:
    """Render an Observed-minus-Calculated timing diagram for TTV work.

    Astrophysical basis:
    A coherent non-zero O-C pattern indicates that a transiting planet is
    arriving early or late relative to a linear ephemeris, a classic signature
    of gravitational perturbations from additional bodies in the system.
    """
    transit_list = list(transits or [])
    if len(transit_list) < 2:
        return None

    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception:
        return None

    transit_numbers = [entry.get("transit_number") for entry in transit_list]
    residuals = [entry.get("o_minus_c_minutes") for entry in transit_list]
    if any(number is None for number in transit_numbers) or any(value is None for value in residuals):
        return None

    os.makedirs(output_dir, exist_ok=True)
    filename = os.path.join(output_dir, f"TIC_{tic_id}_ttv_oc.png")

    plt.figure(figsize=(8.8, 4.8))
    plt.axhline(0.0, color="#1f2937", linestyle="--", linewidth=1.1, alpha=0.7)
    plt.plot(transit_numbers, residuals, color="#2563eb", linewidth=1.5, alpha=0.8)
    plt.scatter(transit_numbers, residuals, c="#d97706", s=32, zorder=3)
    plt.title(f"TIC {tic_id} Transit Timing Variation O-C")
    plt.xlabel("Transit Number")
    plt.ylabel("O - C (minutes)")
    plt.grid(alpha=0.2)
    plt.tight_layout()
    plt.savefig(filename, dpi=160)
    plt.close()
    return filename
