import statistics
import math

def calculate_snr(flux, transit_duration_hours=None):
    # Filter NaNs and ensure valid data
    flux = [f for f in flux if f is not None and not (isinstance(f, float) and math.isnan(f))]
    if not flux or len(flux) < 10:
        return 0.0, 0.0

    # 1. Robust Baseline (Median)
    baseline_median = statistics.median(flux)
    
    # 2. Robust Transit Floor (5th percentile to avoid outliers)
    sorted_flux = sorted(flux)
    n = len(sorted_flux)
    transit_floor = sorted_flux[int(n * 0.05)]
    
    depth = (baseline_median - transit_floor) / baseline_median
    if depth < 0:
        depth = 0.0

    # 3. Robust Sigma (using whole array as fallback, but ideally should be out-of-transit)
    # To improve, let's use the 20th-80th percentile range for noise estimation
    noise_region = sorted_flux[int(n * 0.2):int(n * 0.8)]
    if len(noise_region) > 1:
        baseline_std = statistics.stdev(noise_region)
    else:
        baseline_std = statistics.stdev(flux) if n > 1 else 1e-5
        
    if baseline_std < 1e-6:
        baseline_std = 1e-6

    raw_snr = depth / baseline_std

    # Penalize Wide Dips (e.g., > 24 hours)
    snr = raw_snr
    if transit_duration_hours is not None and transit_duration_hours > 24:
        penalty_factor = 24.0 / transit_duration_hours
        snr = raw_snr * penalty_factor

    return depth, snr

# Simulated data like the fallback
import random
ticId = "261136679"
hash_val = sum(ord(c) for c in ticId)
is_planet = hash_val % 3 != 0
data_points = 300
transit_depth = 0.04 # Example
transit_width = 0.1

flux = []
for i in range(data_points):
    phase = (i / data_points) * 2 - 1
    val = 1.0 + (random.random() - 0.5) * 0.003
    if is_planet and abs(phase) < transit_width:
        val -= transit_depth
    flux.append(val)

d, s = calculate_snr(flux)
print(f"Depth: {d*100:.4f}%")
print(f"SNR: {s:.2f}")
