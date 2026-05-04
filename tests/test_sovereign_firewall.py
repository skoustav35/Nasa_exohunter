import unittest

from exohunter.vetting import (
    analyze_transit_shape,
    apply_contamination_correction,
    compute_validation_probability,
    estimate_impact_parameter,
    run_independent_cognitive_protocol,
    search_secondary_eclipse,
)
from verification_functions import validate_planetary_physics


def build_u_shaped_curve(depth=0.012, width=0.055, points=600):
    phases = [index / points - 0.5 for index in range(points)]
    flux = []
    for phase in phases:
        absolute_phase = abs(phase)
        flux_value = 1.0
        if absolute_phase < width:
            if absolute_phase < 0.02:
                flux_value -= depth
            else:
                fraction = (absolute_phase - 0.02) / max(width - 0.02, 1e-6)
                flux_value -= depth * (1.0 - 0.35 * fraction)
        flux.append(flux_value)
    return phases, flux


def build_v_shaped_binary(depth=0.012, width=0.03, secondary_depth=0.004, points=600):
    phases = [index / points - 0.5 for index in range(points)]
    flux = []
    for phase in phases:
        absolute_phase = abs(phase)
        flux_value = 1.0
        if absolute_phase < width:
            flux_value -= depth * max(0.0, 1.0 - absolute_phase / width)
        secondary_distance = abs(abs(phase) - 0.5)
        if secondary_distance < 0.04:
            flux_value -= secondary_depth * max(0.0, 1.0 - secondary_distance / 0.04)
        flux.append(flux_value)
    return phases, flux


class SovereignFirewallTests(unittest.TestCase):
    def test_gold_data_validates_like_a_planet(self):
        phases, flux = build_u_shaped_curve()
        shape_report = analyze_transit_shape(phases, flux, 5.0, 2.5)
        secondary_report = search_secondary_eclipse(phases, flux, 5.0, 2.5)
        impact_report = estimate_impact_parameter(10.0, 1.0, 0.05, 5.0, 2.5)
        validation = compute_validation_probability(
            18.0,
            5.0,
            impact_report,
            shape_report,
            secondary_report,
            {"status": "unavailable"},
            odd_even_consistent=True,
            challenge_report={"status": "pass", "arguments": []},
            resonance_alert=False,
            transit_depth=0.012,
            cdpp_ppm=120.0,
        )

        self.assertEqual(shape_report["shape"], "U-shape")
        self.assertFalse(secondary_report["detected"])
        self.assertFalse(impact_report["grazing"])
        self.assertGreater(validation["validation_probability"], 0.997)
        self.assertTrue(validation["validated"])

    def test_secondary_eclipse_flags_binary(self):
        phases, flux = build_v_shaped_binary()
        secondary_report = search_secondary_eclipse(phases, flux, 5.0, 7.2)

        self.assertTrue(secondary_report["detected"])
        self.assertGreater(secondary_report["significance_sigma"], 2.0)

    def test_v_shape_is_classified_as_non_planet_like(self):
        phases, flux = build_v_shaped_binary(secondary_depth=0.0)
        shape_report = analyze_transit_shape(phases, flux, 5.0, 7.2)

        self.assertEqual(shape_report["shape"], "V-shape")

    def test_artifact_trap_rejects_impossible_radius(self):
        physics = validate_planetary_physics(148.0, 1500.0, 4.0, 3.0)

        self.assertIn("Stellar Artifact", physics["flags"])
        self.assertLess(physics["integrity_score"], 60.0)

    def test_independent_protocol_argues_against_false_positive(self):
        phases, flux = build_v_shaped_binary()
        shape_report = analyze_transit_shape(phases, flux, 5.0, 7.2)
        impact_report = estimate_impact_parameter(10.0, 1.0, 0.05, 5.0, 1.0)
        secondary_report = search_secondary_eclipse(phases, flux, 5.0, 7.2)
        challenge_report = run_independent_cognitive_protocol(
            phases,
            flux,
            5.0,
            7.2,
            1.0,
            1.41,
            {
                "semi_major_axis_au": 0.05,
                "planet_radius_earth": 10.0,
            },
            shape_report,
            impact_report,
            secondary_report,
        )

        self.assertEqual(challenge_report["status"], "challenged")
        self.assertGreaterEqual(len(challenge_report["arguments"]), 2)

    def test_contamination_correction_inflates_radius_in_crowded_field(self):
        correction = apply_contamination_correction(10.0, 0.44)

        self.assertAlmostEqual(correction["corrected_radius_earth"], 12.0, places=1)
        self.assertTrue(correction["crowded_field_flag"])

    def test_cdpp_noise_penalty_reduces_validation_probability(self):
        phases, flux = build_u_shaped_curve()
        shape_report = analyze_transit_shape(phases, flux, 5.0, 2.5)
        secondary_report = search_secondary_eclipse(phases, flux, 5.0, 2.5)
        impact_report = estimate_impact_parameter(10.0, 1.0, 0.05, 5.0, 2.5)

        low_noise = compute_validation_probability(
            18.0,
            5.0,
            impact_report,
            shape_report,
            secondary_report,
            {"status": "unavailable"},
            odd_even_consistent=True,
            challenge_report={"status": "pass", "arguments": []},
            resonance_alert=False,
            transit_depth=0.012,
            cdpp_ppm=80.0,
        )
        high_noise = compute_validation_probability(
            18.0,
            5.0,
            impact_report,
            shape_report,
            secondary_report,
            {"status": "unavailable"},
            odd_even_consistent=True,
            challenge_report={"status": "pass", "arguments": []},
            resonance_alert=False,
            transit_depth=0.012,
            cdpp_ppm=2500.0,
        )

        self.assertGreater(low_noise["validation_probability"], high_noise["validation_probability"])


if __name__ == "__main__":
    unittest.main()
