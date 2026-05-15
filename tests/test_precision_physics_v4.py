"""
Validation tests for Precision Physics v4.0

Tests that the upgraded calculate_orbital_physics() produces correct radii
for known exoplanets when given their true parameters.

WASP-18b ground truth: R_p = 13.34 R_earth, P = 0.94145d, R_* = 1.29 R_sun,
                        T_eff = 6400K, log_g = 4.37, delta = 0.0091
WASP-46b ground truth: R_p = 14.68 R_earth, P = 1.43037d, R_* = 0.917 R_sun,
                        T_eff = 5620K, log_g = 4.49, delta = 0.0195
"""
import sys
import json
import math

# Ensure parent directory is on path
sys.path.insert(0, ".")

# Test the limb darkening module directly first
from exohunter.limb_darkening import (
    get_limb_darkening_correction,
    compute_crowdsap_from_contratio,
    get_extreme_proximity_correction,
)

print("=" * 60)
print("PRECISION PHYSICS v4.0 — VALIDATION SUITE")
print("=" * 60)

# ═══════════════════════════════════════════════════════════════
# TEST 1: Limb Darkening Module
# ═══════════════════════════════════════════════════════════════
print("\n--- Test 1: Limb Darkening Coefficients ---")

# WASP-18: T_eff = 6400K, log_g = 4.37
ld_wasp18 = get_limb_darkening_correction(6400, 4.37)
print(f"WASP-18 host: T_eff=6400K, log_g=4.37")
print(f"  u1={ld_wasp18['u1']}, u2={ld_wasp18['u2']}")
print(f"  LD denominator = {ld_wasp18['ld_denominator']}")
print(f"  Correction factor = {ld_wasp18['correction_factor']}")
print(f"  Source: {ld_wasp18['source']}")

# WASP-46: T_eff = 5620K, log_g = 4.49
ld_wasp46 = get_limb_darkening_correction(5620, 4.49)
print(f"\nWASP-46 host: T_eff=5620K, log_g=4.49")
print(f"  u1={ld_wasp46['u1']}, u2={ld_wasp46['u2']}")
print(f"  LD denominator = {ld_wasp46['ld_denominator']}")
print(f"  Correction factor = {ld_wasp46['correction_factor']}")

# Solar defaults
ld_solar = get_limb_darkening_correction(None, None)
print(f"\nSolar default: u1={ld_solar['u1']}, u2={ld_solar['u2']}")
print(f"  Correction factor = {ld_solar['correction_factor']}")

# ═══════════════════════════════════════════════════════════════
# TEST 2: CROWDSAP Dilution
# ═══════════════════════════════════════════════════════════════
print("\n--- Test 2: CROWDSAP Dilution ---")

# No contamination
cs0 = compute_crowdsap_from_contratio(0.0)
print(f"No contamination: CROWDSAP={cs0['crowdsap']}, dilution_factor={cs0['dilution_factor']}")

# 10% contamination
cs10 = compute_crowdsap_from_contratio(0.10)
print(f"10% contamination: CROWDSAP={cs10['crowdsap']:.4f}, dilution_factor={cs10['dilution_factor']:.4f}")

# 50% contamination
cs50 = compute_crowdsap_from_contratio(0.50)
print(f"50% contamination: CROWDSAP={cs50['crowdsap']:.4f}, dilution_factor={cs50['dilution_factor']:.4f}")

# ═══════════════════════════════════════════════════════════════
# TEST 3: Extreme Proximity Guard
# ═══════════════════════════════════════════════════════════════
print("\n--- Test 3: Extreme Proximity Guard ---")

# WASP-18b: P = 0.94145d (should trigger)
prox_wasp18 = get_extreme_proximity_correction(0.94145, 1.29, 1.33, r_planet_earth=13.0)
print(f"WASP-18b (P=0.94d): triggered={prox_wasp18['triggered']}, factor={prox_wasp18['proximity_factor']}")
print(f"  Oblateness: {prox_wasp18.get('oblateness', 'N/A')}")

# WASP-46b: P = 1.43037d (should trigger)
prox_wasp46 = get_extreme_proximity_correction(1.43037, 0.917, 0.956, r_planet_earth=14.0)
print(f"WASP-46b (P=1.43d): triggered={prox_wasp46['triggered']}, factor={prox_wasp46['proximity_factor']}")

# Normal period: P = 5.0d (should NOT trigger)
prox_normal = get_extreme_proximity_correction(5.0, 1.0, 1.0, r_planet_earth=11.0)
print(f"Normal (P=5.0d): triggered={prox_normal['triggered']}, factor={prox_normal['proximity_factor']}")

# ═══════════════════════════════════════════════════════════════
# TEST 4: Full calculate_orbital_physics — WASP-18b
# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("TEST 4: WASP-18b — Full Orbital Physics (v4.0)")
print("=" * 60)

from verification_functions import calculate_orbital_physics

# WASP-18b known params:
# R_* = 1.29 R_sun, T_eff = 6400K, log_g = 4.37
# M_* = 1.33 M_sun (can use catalog), P = 0.94145d
# Transit depth: delta ~ 0.91% = 0.0091
# Ground truth R_p = 1.165 R_Jup = 13.05 R_earth (some sources: 13.34)

wasp18_depth = 0.0091  # observed transit depth

orbital_wasp18 = calculate_orbital_physics(
    period_days=0.94145,
    depth=wasp18_depth,
    estimated_r_star_solar=1.29,
    transit_duration_hours=2.14,
    stellar_teff_override=6400,
    contamination_ratio=0.0,
    stellar_logg=4.37,
    stellar_mass_solar=1.33,
)

rp_wasp18 = orbital_wasp18["planet_radius_earth"]
rp_naive = orbital_wasp18["planet_radius_observed_earth"]
ground_truth_wasp18 = 13.34

print(f"  Measured depth:      {wasp18_depth}")
print(f"  R_* used:            1.29 R_sun")
print(f"  Naive R_p:           {rp_naive:.3f} R_earth")
print(f"  v4.0 R_p:            {rp_wasp18:.3f} R_earth")
print(f"  Ground truth R_p:    {ground_truth_wasp18} R_earth")
delta_pct = abs(rp_wasp18 - ground_truth_wasp18) / ground_truth_wasp18 * 100
print(f"  Delta from truth:    {delta_pct:.1f}%")
print(f"  LD: u1={orbital_wasp18['limb_darkening']['u1']}, u2={orbital_wasp18['limb_darkening']['u2']}")
print(f"  CROWDSAP: {orbital_wasp18['crowdsap_correction']['crowdsap']}")
print(f"  Proximity: triggered={orbital_wasp18['proximity_correction']['triggered']}, factor={orbital_wasp18['proximity_correction']['proximity_factor']}")
print(f"  Classification: {orbital_wasp18['classification']}")

if delta_pct <= 15:
    print(f"  ✅ PASS (within 15% of ground truth)")
else:
    print(f"  ❌ FAIL (delta {delta_pct:.1f}% exceeds 15% threshold)")

# ═══════════════════════════════════════════════════════════════
# TEST 5: Full calculate_orbital_physics — WASP-46b
# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("TEST 5: WASP-46b — Full Orbital Physics (v4.0)")
print("=" * 60)

# WASP-46b known params:
# R_* = 0.917 R_sun, T_eff = 5620K, log_g = 4.49
# M_* = 0.956 M_sun, P = 1.43037d
# Transit depth: delta ~ 0.0195 (1.95%)
# Ground truth R_p = 1.310 R_Jup ≈ 14.68 R_earth

wasp46_depth = 0.0195  # observed transit depth

orbital_wasp46 = calculate_orbital_physics(
    period_days=1.43037,
    depth=wasp46_depth,
    estimated_r_star_solar=0.917,
    transit_duration_hours=1.67,
    stellar_teff_override=5620,
    contamination_ratio=0.0,
    stellar_logg=4.49,
    stellar_mass_solar=0.956,
)

rp_wasp46 = orbital_wasp46["planet_radius_earth"]
rp_naive_46 = orbital_wasp46["planet_radius_observed_earth"]
ground_truth_wasp46 = 14.68

print(f"  Measured depth:      {wasp46_depth}")
print(f"  R_* used:            0.917 R_sun")
print(f"  Naive R_p:           {rp_naive_46:.3f} R_earth")
print(f"  v4.0 R_p:            {rp_wasp46:.3f} R_earth")
print(f"  Ground truth R_p:    {ground_truth_wasp46} R_earth")
delta_pct_46 = abs(rp_wasp46 - ground_truth_wasp46) / ground_truth_wasp46 * 100
print(f"  Delta from truth:    {delta_pct_46:.1f}%")
print(f"  LD: u1={orbital_wasp46['limb_darkening']['u1']}, u2={orbital_wasp46['limb_darkening']['u2']}")
print(f"  CROWDSAP: {orbital_wasp46['crowdsap_correction']['crowdsap']}")
print(f"  Proximity: triggered={orbital_wasp46['proximity_correction']['triggered']}, factor={orbital_wasp46['proximity_correction']['proximity_factor']}")
print(f"  Classification: {orbital_wasp46['classification']}")

if delta_pct_46 <= 15:
    print(f"  ✅ PASS (within 15% of ground truth)")
else:
    print(f"  ❌ FAIL (delta {delta_pct_46:.1f}% exceeds 15% threshold)")

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("VALIDATION SUMMARY")
print("=" * 60)
print(f"  WASP-18b: {rp_naive:.1f} → {rp_wasp18:.1f} R⊕ (truth: {ground_truth_wasp18}) — delta {delta_pct:.1f}%")
print(f"  WASP-46b: {rp_naive_46:.1f} → {rp_wasp46:.1f} R⊕ (truth: {ground_truth_wasp46}) — delta {delta_pct_46:.1f}%")

both_pass = delta_pct <= 15 and delta_pct_46 <= 15
print(f"\n  Overall: {'✅ ALL TESTS PASS' if both_pass else '❌ SOME TESTS FAILED'}")
