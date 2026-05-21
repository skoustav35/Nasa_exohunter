"""Pre-processing utilities for TESS light curves."""

from __future__ import annotations

import gc
import os
import statistics
from concurrent.futures import ProcessPoolExecutor
from typing import Iterable, List, Optional

try:
    import numpy as np
except Exception:  # pragma: no cover - optional dependency guard
    np = None

try:
    import lightkurve as lk
except Exception:  # pragma: no cover - optional dependency guard
    lk = None

try:
    from celerite2 import GaussianProcess, terms
except Exception:  # pragma: no cover - optional dependency guard
    GaussianProcess = None
    terms = None

try:
    from scipy.interpolate import UnivariateSpline
except Exception:  # pragma: no cover - optional dependency guard
    UnivariateSpline = None

from exohunter.vetting import estimate_cdpp_ppm, estimate_phase_half_width, normalize_phase_array


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


def _rolling_median(values: List[float], window: int) -> List[float]:
    if not values:
        return []
    if window <= 1:
        return list(values)
    half_window = max(1, window // 2)
    trend: List[float] = []
    for index in range(len(values)):
        start = max(0, index - half_window)
        stop = min(len(values), index + half_window + 1)
        trend.append(float(statistics.median(values[start:stop])))
    return trend


def _is_absolute_time_series(values: List[float]) -> bool:
    if len(values) < 3:
        return False
    minimum = min(values)
    maximum = max(values)
    return (maximum - minimum) > 2.0 and (minimum < -1.0 or maximum > 1.0)


def _estimate_cadence_hours(time_values: List[float]) -> float:
    if len(time_values) < 2:
        return 0.0333
    sorted_times = sorted(time_values)
    deltas = [right - left for left, right in zip(sorted_times[:-1], sorted_times[1:]) if right > left]
    if not deltas:
        return 0.0333
    return max(1e-4, float(statistics.median(deltas)) * 24.0)


def spline_normalize_sector(
    time_data: Optional[Iterable[float]],
    flux_data: Optional[Iterable[float]],
    smoothing_scale: float = 0.001,
) -> dict:
    """Spline-normalize a single TESS sector to remove slow baseline structure.

    Astrophysical basis:
    Sector-by-sector TESS photometry often contains smooth trends from thermal
    settling, scattered light, or aperture changes. A low-order spline fit to
    the outlier-clipped baseline preserves transit morphology while removing
    long-timescale drifts that would otherwise create sector jumps after
    stitching.
    """
    time_values = _to_float_list(time_data)
    flux_values = _to_float_list(flux_data)
    if len(time_values) != len(flux_values) or len(flux_values) < 10:
        return {
            "status": "unavailable",
            "time": time_values,
            "flux": flux_values,
            "trend": flux_values,
            "reason": "Sector normalization requires matched time/flux arrays with at least 10 cadences.",
        }

    if UnivariateSpline is not None and np is not None and len(time_values) >= 20:
        try:
            x = np.asarray(time_values, dtype=float)
            y = np.asarray(flux_values, dtype=float)
            smoothing = max(1e-10, len(x) * np.var(y) * smoothing_scale)
            spline = UnivariateSpline(x, y, s=smoothing)
            trend = spline(x)
            baseline = float(np.median(trend))
            normalized = (y / np.where(trend == 0, baseline, trend)) * baseline
            return {
                "status": "success",
                "time": time_values,
                "flux": normalized.tolist(),
                "trend": trend.tolist(),
                "method": "scipy-spline",
                "reason": "Univariate spline removed sector-scale baseline drift.",
            }
        except Exception:
            pass

    window = max(5, len(flux_values) // 15)
    trend = _rolling_median(flux_values, window)
    baseline = statistics.median(trend)
    normalized = [flux - (trend_value - baseline) for flux, trend_value in zip(flux_values, trend)]
    return {
        "status": "success",
        "time": time_values,
        "flux": normalized,
        "trend": trend,
        "method": "rolling-median",
        "reason": "Fallback sector normalization used a rolling median because spline support was unavailable.",
    }


def align_multisector_jitter(sector_series: Optional[List[dict]]) -> dict:
    """Align sector-to-sector flux jumps before global stitching.

    Astrophysical basis:
    Independent TESS sectors can land on different flux baselines because the
    aperture, background, and spacecraft pointing vary from sector to sector.
    We first flatten each sector and then fit a smooth spline through the sector
    medians so the stitched light curve does not show artificial discontinuities.
    """
    if not sector_series:
        return {
            "status": "unavailable",
            "sector_series": [],
            "reason": "No sector-wise light curves were available for jitter alignment.",
        }

    normalized_sectors = []
    sector_centers = []
    sector_medians = []
    for raw_sector in sector_series:
        normalized = spline_normalize_sector(raw_sector.get("time"), raw_sector.get("flux"))
        flux_values = normalized.get("flux", [])
        time_values = normalized.get("time", [])
        if not flux_values or not time_values:
            continue
        median_flux = float(statistics.median(flux_values))
        normalized_sectors.append(
            {
                "sector": raw_sector.get("sector"),
                "time": time_values,
                "flux": flux_values,
                "median_flux": median_flux,
                "normalization": {
                    "method": normalized.get("method"),
                    "reason": normalized.get("reason"),
                },
            }
        )
        sector_centers.append((time_values[0] + time_values[-1]) / 2.0)
        sector_medians.append(median_flux)

    if not normalized_sectors:
        return {
            "status": "unavailable",
            "sector_series": [],
            "reason": "All sector segments failed normalization.",
        }

    global_baseline = float(statistics.median(sector_medians))
    smoothed_medians = sector_medians[:]
    if UnivariateSpline is not None and np is not None and len(sector_centers) >= 3:
        try:
            spline = UnivariateSpline(
                np.asarray(sector_centers, dtype=float),
                np.asarray(sector_medians, dtype=float),
                s=max(1e-10, len(sector_centers) * np.var(sector_medians) * 0.05),
            )
            smoothed_medians = spline(np.asarray(sector_centers, dtype=float)).tolist()
        except Exception:
            smoothed_medians = sector_medians[:]

    aligned_sectors = []
    for sector_data, smooth_median in zip(normalized_sectors, smoothed_medians):
        scale = global_baseline / max(float(smooth_median), 1e-8)
        aligned_flux = [value * scale for value in sector_data["flux"]]
        aligned_sectors.append(
            {
                "sector": sector_data["sector"],
                "time": sector_data["time"],
                "flux": aligned_flux,
                "median_flux_before": round(sector_data["median_flux"], 6),
                "median_flux_after": round(float(statistics.median(aligned_flux)), 6),
                "scale_factor": round(scale, 6),
                "normalization": sector_data["normalization"],
            }
        )

    return {
        "status": "success",
        "sector_series": aligned_sectors,
        "global_baseline": round(global_baseline, 6),
        "sector_count": len(aligned_sectors),
    }


def _gp_worker(payload: dict) -> dict:
    return apply_gp_detrending(
        payload.get("time"),
        payload.get("flux"),
        period_days=payload.get("period_days"),
        duration_hours=payload.get("duration_hours"),
    )


def parallel_gp_detrend_sectors(
    sector_series: Optional[List[dict]],
    period_days: Optional[float],
    duration_hours: Optional[float],
    max_workers: Optional[int] = None,
) -> dict:
    """Run sector-wise GP detrending in isolated worker processes.

    Astrophysical basis:
    GP detrending is the most CPU-intensive light-curve cleaning step. Running
    independent sectors in separate processes avoids the Python GIL and keeps
    long-lived worker memory bounded, which is important for large multi-sector
    TESS jobs.
    """
    if not sector_series:
        return {
            "status": "unavailable",
            "sector_series": [],
            "reason": "No sector segments were available for parallel GP detrending.",
        }

    payloads = [
        {
            "sector": sector.get("sector"),
            "time": sector.get("time"),
            "flux": sector.get("flux"),
            "period_days": period_days,
            "duration_hours": duration_hours,
        }
        for sector in sector_series
    ]

    if len(payloads) == 1:
        result = _gp_worker(payloads[0])
        result["sector"] = payloads[0].get("sector")
        return {"status": "success", "sector_series": [result], "parallel": False}

    worker_count = min(max_workers or os.cpu_count() or 1, max(1, len(payloads)), 4)
    results = []
    try:
        try:
            executor = ProcessPoolExecutor(max_workers=worker_count, max_tasks_per_child=1)
        except TypeError:
            executor = ProcessPoolExecutor(max_workers=worker_count)
        with executor:
            mapped = executor.map(_gp_worker, payloads)
            for payload, result in zip(payloads, mapped):
                result["sector"] = payload.get("sector")
                results.append(result)
    finally:
        gc.collect()

    return {
        "status": "success",
        "sector_series": results,
        "parallel": True,
        "workers": worker_count,
    }


def stitch_multisector_light_curve(tic_id: str, author: str = "SPOC") -> dict:
    """Download all available TESS sectors for a target and prepare them for stitching."""
    if lk is None:
        return {
            "status": "unavailable",
            "reason": "lightkurve is not installed, so multi-sector stitching is disabled.",
        }

    try:
        search = lk.search_lightcurve(f"TIC {tic_id}", mission="TESS", author=author)
        if len(search) == 0:
            return {
                "status": "unavailable",
                "reason": f"No TESS light curves were returned for TIC {tic_id}.",
            }

        collection = search.download_all(download_dir=os.getenv("LIGHTKURVE_CACHE_DIR"))
        if collection is None or len(collection) == 0:
            return {
                "status": "unavailable",
                "reason": "The TESS search succeeded, but no sector files could be downloaded.",
            }

        stitched_list = []
        sectors = []
        sector_series = []
        for light_curve in collection:
            cleaned = light_curve.remove_nans()
            
            # Apply CBV per-sector BEFORE stitching
            try:
                from lightkurve.correctors import CBVCorrector
                corrector = CBVCorrector(cleaned)
                cleaned = corrector.correct()
            except Exception as e:
                import sys
                print(f"CBV correction failed for sector: {e}", file=sys.stderr)
            
            stitched_list.append(cleaned)
            
            sector = cleaned.meta.get("SECTOR") if hasattr(cleaned, "meta") else None
            if sector is not None:
                sectors.append(int(sector))
            sector_time = cleaned.time.value.tolist() if hasattr(cleaned.time, "value") else list(cleaned.time)
            sector_flux = cleaned.flux.value.tolist() if hasattr(cleaned.flux, "value") else list(cleaned.flux)
            sector_series.append(
                {
                    "sector": int(sector) if sector is not None else None,
                    "time": sector_time,
                    "flux": sector_flux,
                }
            )

        if stitched_list:
            import lightkurve as lk
            stitched = lk.LightCurveCollection(stitched_list).stitch()
            time_values = stitched.time.value.tolist() if hasattr(stitched.time, "value") else list(stitched.time)
            flux_values = stitched.flux.value.tolist() if hasattr(stitched.flux, "value") else list(stitched.flux)
        else:
            return {"status": "error", "reason": "No valid sectors after cleaning."}

        return {
            "status": "success",
            "time": time_values,
            "flux": flux_values,
            "sectors": sorted(set(sectors)),
            "sector_count": len(set(sectors)),
            "author": author,
            "lightcurve": stitched,
            "sector_series": sector_series,
        }
    except Exception as exc:
        return {
            "status": "error",
            "reason": str(exc),
        }


def apply_cbv_correction(
    tic_id: str,
    time_data: Optional[Iterable[float]] = None,
    flux_data: Optional[Iterable[float]] = None,
    lightcurve=None,
) -> dict:
    if lk is None:
        return {
            "status": "unavailable",
            "time": _to_float_list(time_data),
            "flux": _to_float_list(flux_data),
            "method": "none",
            "reason": "lightkurve is not installed, so CBV correction was skipped.",
        }

    if lightcurve is None:
        return {
            "status": "unavailable",
            "time": _to_float_list(time_data),
            "flux": _to_float_list(flux_data),
            "method": "none",
            "reason": f"CBV correction needs a raw lightkurve LightCurve for TIC {tic_id}.",
        }

    try:
        from lightkurve.correctors import CBVCorrector

        corrector = CBVCorrector(lightcurve)
        corrected = corrector.correct()
        time_values = corrected.time.value.tolist() if hasattr(corrected.time, "value") else list(corrected.time)
        flux_values = corrected.flux.value.tolist() if hasattr(corrected.flux, "value") else list(corrected.flux)
        return {
            "status": "success",
            "time": time_values,
            "flux": flux_values,
            "method": "lightkurve-cbv",
            "reason": "Co-trending basis vectors removed common TESS systematics.",
        }
    except Exception as exc:
        return {
            "status": "error",
            "time": _to_float_list(time_data),
            "flux": _to_float_list(flux_data),
            "method": "none",
            "reason": f"CBV correction failed: {exc}",
        }


def apply_pld_correction(
    time_data: Optional[Iterable[float]] = None,
    flux_data: Optional[Iterable[float]] = None,
    target_pixel_file=None,
) -> dict:
    """Optionally run Lightkurve Pixel-Level Decorrelation when a TPF is present."""
    if lk is None:
        return {
            "status": "unavailable",
            "time": _to_float_list(time_data),
            "flux": _to_float_list(flux_data),
            "method": "none",
            "reason": "lightkurve is not installed, so PLD correction was skipped.",
        }
    if target_pixel_file is None:
        return {
            "status": "unavailable",
            "time": _to_float_list(time_data),
            "flux": _to_float_list(flux_data),
            "method": "none",
            "reason": "No TESS target pixel file was available for PLD correction.",
        }
    try:
        from lightkurve.correctors import PLDCorrector

        aperture = getattr(target_pixel_file, "pipeline_mask", None)
        corrector = PLDCorrector(target_pixel_file, aperture_mask=aperture)
        corrected = corrector.correct(pca_components=5, aperture_mask=aperture)
        time_values = corrected.time.value.tolist() if hasattr(corrected.time, "value") else list(corrected.time)
        flux_values = corrected.flux.value.tolist() if hasattr(corrected.flux, "value") else list(corrected.flux)
        return {
            "status": "success",
            "time": time_values,
            "flux": flux_values,
            "method": "lightkurve-pld",
            "reason": "Pixel-Level Decorrelation removed pixel-level pointing and scattered-light structure.",
        }
    except Exception as exc:
        return {
            "status": "error",
            "time": _to_float_list(time_data),
            "flux": _to_float_list(flux_data),
            "method": "none",
            "reason": f"PLD correction failed: {exc}",
        }


def apply_gp_detrending(
    time_data: Optional[Iterable[float]],
    flux_data: Optional[Iterable[float]],
    period_days: Optional[float] = None,
    duration_hours: Optional[float] = None,
) -> dict:
    time_values = _to_float_list(time_data)
    flux_values = _to_float_list(flux_data)
    if len(time_values) != len(flux_values) or len(flux_values) < 20:
        return {
            "status": "unavailable",
            "time": time_values,
            "flux": flux_values,
            "trend": [],
            "method": "none",
            "reason": "Not enough points are available for detrending.",
        }

    protected_mask = [False] * len(time_values)
    if period_days and duration_hours and _is_absolute_time_series(time_values):
        epoch = time_values[min(range(len(flux_values)), key=lambda idx: flux_values[idx])]
        half_width_days = max((duration_hours / 24.0) * 1.3, period_days * 0.02)
        for index, time_value in enumerate(time_values):
            phase_offset = ((time_value - epoch + 0.5 * period_days) % period_days) - (0.5 * period_days)
            protected_mask[index] = abs(phase_offset) <= half_width_days
    elif period_days and duration_hours:
        norm_phases = normalize_phase_array(time_values)
        half_width = estimate_phase_half_width(period_days, duration_hours)
        protected_mask = [abs(phase) <= half_width * 1.3 for phase in norm_phases]

    if GaussianProcess is not None and terms is not None and np is not None:
        try:
            x = np.asarray(time_values, dtype=float)
            y = np.asarray(flux_values, dtype=float)
            train_mask = ~np.asarray(protected_mask, dtype=bool)
            if train_mask.sum() >= 10:
                x_train = x[train_mask]
                y_train = y[train_mask]
                sigma = float(np.std(y_train))
                
                # Check for stellar rotation period using Lomb-Scargle on out-of-transit flux
                p_rot = None
                ls_power = 0.0
                try:
                    from astropy.timeseries import LombScargle
                    ls = LombScargle(x_train, y_train)
                    frequency, power = ls.autopower(minimum_frequency=1/20.0, maximum_frequency=1/0.5)
                    max_idx = np.argmax(power)
                    ls_power = float(power[max_idx])
                    p_rot = float(1.0 / frequency[max_idx])
                except Exception:
                    pass
                
                if p_rot is not None and ls_power > 0.1:
                    # Quasi-Periodic double SHO kernel (fundamental + first harmonic)
                    kernel_fundamental = terms.SHOTerm(sigma=sigma, Q=1.0/np.sqrt(2.0), rho=p_rot)
                    kernel_harmonic = terms.SHOTerm(sigma=sigma * 0.5, Q=1.0/np.sqrt(2.0), rho=p_rot / 2.0)
                    kernel = kernel_fundamental + kernel_harmonic
                    method_name = "celerite2-gp-qp"
                    reason_msg = f"celerite2 Quasi-Periodic GP (P_rot={p_rot:.2f}d, power={ls_power:.3f}) removed stellar variability."
                else:
                    rho = max(float(np.median(np.diff(np.sort(x_train)))), (float(x_train.max()) - float(x_train.min())) / 30.0)
                    kernel = terms.Matern32Term(sigma=max(sigma, 1e-5), rho=max(rho, 1e-4))
                    method_name = "celerite2-gp"
                    reason_msg = "celerite2 GP removed low-frequency stellar variability while masking transit samples."
                
                gp = GaussianProcess(kernel, mean=float(np.median(y_train)))
                gp.compute(x_train, diag=np.full(len(x_train), max(sigma * 0.1, 1e-6) ** 2))
                trend = gp.predict(y_train - float(np.median(y_train)), x) + float(np.median(y_train))
                baseline = float(np.median(trend))
                detrended = (y - (trend - baseline)).tolist()
                return {
                    "status": "success",
                    "time": time_values,
                    "flux": detrended,
                    "trend": trend.tolist(),
                    "method": method_name,
                    "reason": reason_msg,
                }
        except Exception:
            pass

    window = max(5, len(flux_values) // 20)
    trend = _rolling_median(flux_values, window)
    baseline = statistics.median(trend)
    detrended = [flux - (trend_value - baseline) for flux, trend_value in zip(flux_values, trend)]
    return {
        "status": "success",
        "time": time_values,
        "flux": detrended,
        "trend": trend,
        "method": "rolling-median",
        "reason": "Fallback detrending used a rolling median because celerite2 was unavailable.",
    }


def preprocess_light_curve(
    tic_id: str,
    time_data: Optional[Iterable[float]],
    flux_data: Optional[Iterable[float]],
    period_days: Optional[float] = None,
    duration_hours: Optional[float] = None,
    lightcurve=None,
    target_pixel_file=None,
    sector_series: Optional[List[dict]] = None,
) -> dict:
    """Run the ExoHunter pre-processing stack on a light curve.

    Astrophysical basis:
    The production pre-processing path removes instrumental systematics (CBVs),
    aligns sector baselines, and then detrends stellar variability with a GP or
    a robust fallback. The returned CDPP estimate quantifies the residual noise
    level on transit timescales for downstream FPP scoring.
    """
    pld_result = apply_pld_correction(time_data, flux_data, target_pixel_file=target_pixel_file)
    pld_time = pld_result.get("time")
    pld_flux = pld_result.get("flux")

    cbv_result = apply_cbv_correction(tic_id, pld_time, pld_flux, lightcurve=lightcurve)
    cbv_time = cbv_result.get("time")
    cbv_flux = cbv_result.get("flux")

    alignment_result = align_multisector_jitter(sector_series)
    if alignment_result.get("status") == "success":
        gp_sector_result = parallel_gp_detrend_sectors(
            alignment_result.get("sector_series"),
            period_days=period_days,
            duration_hours=duration_hours,
        )
        if gp_sector_result.get("status") == "success":
            combined = []
            for sector in gp_sector_result.get("sector_series", []):
                combined.extend(zip(sector.get("time", []), sector.get("flux", [])))
            combined.sort(key=lambda item: item[0])
            gp_time = [item[0] for item in combined]
            gp_flux = [item[1] for item in combined]
            gp_result = {
                "status": "success",
                "time": gp_time,
                "flux": gp_flux,
                "trend": [],
                "method": "parallel-sector-gp",
                "reason": "Sector-aligned multiprocessing GP detrending completed successfully.",
            }
        else:
            gp_result = apply_gp_detrending(
                cbv_time,
                cbv_flux,
                period_days=period_days,
                duration_hours=duration_hours,
            )
    else:
        gp_result = apply_gp_detrending(
            cbv_time,
            cbv_flux,
            period_days=period_days,
            duration_hours=duration_hours,
        )

    final_time = gp_result.get("time", cbv_time or [])
    final_flux = gp_result.get("flux", cbv_flux or [])
    cdpp_report = estimate_cdpp_ppm(
        final_flux,
        cadence_hours=_estimate_cadence_hours(final_time),
        transit_duration_hours=duration_hours,
    )

    return {
        "status": "success",
        "time": final_time,
        "flux": final_flux,
        "cbv": {
            "status": cbv_result.get("status"),
            "method": cbv_result.get("method"),
            "reason": cbv_result.get("reason"),
        },
        "pld": {
            "status": pld_result.get("status"),
            "method": pld_result.get("method"),
            "reason": pld_result.get("reason"),
        },
        "gp": {
            "status": gp_result.get("status"),
            "method": gp_result.get("method"),
            "reason": gp_result.get("reason"),
        },
        "sector_alignment": {
            "status": alignment_result.get("status"),
            "sector_count": alignment_result.get("sector_count"),
            "reason": alignment_result.get("reason"),
        },
        "trend": gp_result.get("trend", []),
        "cdpp": cdpp_report,
    }
