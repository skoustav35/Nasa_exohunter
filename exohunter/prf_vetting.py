import numpy as np
import lightkurve as lk
from typing import Optional, Tuple, Dict
import sys

def perform_prf_difference_imaging(tic_id: str, period: float, t0: float, duration_hours: float) -> Dict[str, object]:
    """
    Downloads TESS Target Pixel Files (TPFs) and constructs in-transit vs out-of-transit difference images.
    Computes PRF centroid shifts to rule out Background Eclipsing Binaries (BGEBs).
    """
    try:
        search = lk.search_targetpixelfile(f"TIC {tic_id}", mission="TESS", author="SPOC")
        if not search:
            return {"status": "unavailable", "reason": f"No TPFs found for TIC {tic_id}"}
        
        # Download the best single sector TPF (usually the first one available)
        tpf = search[0].download(quality_bitmask="default")
        if not tpf:
            return {"status": "error", "reason": "Failed to download TPF"}

        # Extract time and flux
        time = tpf.time.value
        flux = tpf.flux.value
        
        # Determine transit masks
        # Phase folding
        phase = ((time - t0) % period) / period
        phase[phase > 0.5] -= 1.0
        
        half_duration_phase = (duration_hours / 24.0) / period / 2.0
        
        in_transit_mask = np.abs(phase) <= half_duration_phase
        # Out of transit mask: slightly away from the transit
        out_transit_mask = (np.abs(phase) > half_duration_phase * 2.0) & (np.abs(phase) < 0.25)
        
        if np.sum(in_transit_mask) < 3 or np.sum(out_transit_mask) < 10:
            return {"status": "insufficient_data", "reason": "Not enough data points in/out of transit"}

        # Calculate median images
        in_transit_image = np.nanmedian(flux[in_transit_mask], axis=0)
        out_transit_image = np.nanmedian(flux[out_transit_mask], axis=0)
        
        # Difference image (Out - In = depth)
        diff_image = out_transit_image - in_transit_image
        
        # Simple Center of Mass (centroid) for the difference image vs the out of transit image
        def get_centroid(img):
            img_clean = np.nan_to_num(img, 0)
            img_clean[img_clean < 0] = 0
            total = np.sum(img_clean)
            if total == 0:
                return None, None
            y_coords, x_coords = np.indices(img_clean.shape)
            x_c = np.sum(x_coords * img_clean) / total
            y_c = np.sum(y_coords * img_clean) / total
            return x_c, y_c

        x_out, y_out = get_centroid(out_transit_image)
        x_diff, y_diff = get_centroid(diff_image)
        
        if x_out is None or x_diff is None:
            return {"status": "error", "reason": "Centroid calculation failed (zero flux)"}
            
        shift_pixels = np.sqrt((x_out - x_diff)**2 + (y_out - y_diff)**2)
        
        return {
            "status": "success",
            "prf_shift_pixels": float(shift_pixels),
            "is_on_target": shift_pixels < 0.5, # Less than 0.5 pixels suggests it's on target
            "out_of_transit_centroid": (float(x_out), float(y_out)),
            "difference_centroid": (float(x_diff), float(y_diff)),
        }
    except Exception as e:
        print(f"[PRF VETTING ERROR] {e}", file=sys.stderr)
        return {"status": "error", "reason": str(e)}
