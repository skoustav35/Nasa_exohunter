import unittest

from exohunter.grounding import enforce_isolated_target_lookup, resolve_stellar_lockdown
from exohunter.limb_darkening import get_limb_darkening_correction
from exohunter.simulation import (
    KNOWN_MULTI_PLANET_SYSTEMS,
    expected_observed_depth_from_radius,
    extract_decoupled_planetary_parameters,
    get_known_planet_prior,
)
from exohunter.vetting import secure_report_badge_assignment, validate_geometric_radius_depth
from verification_functions import (
    _apply_benchmark_depth_lock_if_needed,
    _select_impact_parameter_report,
    calculate_orbital_physics,
)


class SovereignV5ControlTests(unittest.TestCase):
    def test_toi141_control_is_hd213885_b(self):
        context = enforce_isolated_target_lookup(
            "403224672",
            current_target_name="TOI-141 b",
            measured_period_days=1.008035,
        )
        stellar = resolve_stellar_lockdown(
            "403224672",
            period_days=1.008035,
            claimed_name="TOI-141 b",
        )
        prior = get_known_planet_prior("403224672", 1.008035, "TOI-141 b")

        self.assertEqual(context.verified_name, "HD 213885 b")
        self.assertEqual(prior["name"], "HD 213885 b")
        self.assertLessEqual(prior["radius_earth"], 2.0)
        self.assertAlmostEqual(stellar["stellar_radius_solar"], 1.1011, places=4)
        self.assertIsNone(get_known_planet_prior("425934411"))

    def test_toi141_orbital_radius_stays_super_earth_scale(self):
        prior = get_known_planet_prior("403224672", 1.008035)
        ld = get_limb_darkening_correction(prior["teff"], prior["logg"])
        observed_depth = expected_observed_depth_from_radius(
            prior["radius_earth"],
            prior["stellar_radius_solar"],
            ld["ld_denominator"],
            prior["crowdsap"],
        )
        orbital = calculate_orbital_physics(
            period_days=prior["period_days"],
            depth=observed_depth,
            estimated_r_star_solar=prior["stellar_radius_solar"],
            transit_duration_hours=2.0,
            stellar_teff_override=prior["teff"],
            contamination_ratio=max(0.0, (1.0 / prior["crowdsap"]) - 1.0),
            stellar_logg=prior["logg"],
            stellar_mass_solar=prior["stellar_mass_solar"],
            tic_id="403224672",
            metadata={"CROWDSAP": prior["crowdsap"], "FLFRCSAP": prior["flfrcsap"]},
        )

        self.assertAlmostEqual(orbital["planet_radius_earth"], 1.745, places=3)
        self.assertLess(orbital["planet_radius_earth"], 2.0)
        self.assertTrue(orbital["radius_solution"]["benchmark_locked"])
        self.assertTrue(orbital["radius_depth_geometric_check"]["ok"])

    def test_toi700d_period_decouples_from_planet_c(self):
        matrix = KNOWN_MULTI_PLANET_SYSTEMS["150428135"]
        planet_d = extract_decoupled_planetary_parameters(matrix, 37.42396)
        planet_c = extract_decoupled_planetary_parameters(matrix, 16.051098)

        self.assertEqual(planet_d["name"], "TOI-700 d")
        self.assertAlmostEqual(planet_d["radius_earth"], 1.073, places=3)
        self.assertEqual(planet_c["name"], "TOI-700 c")
        self.assertNotEqual(planet_d["radius_earth"], planet_c["radius_earth"])
        with self.assertRaises(ValueError):
            extract_decoupled_planetary_parameters(matrix, 99.0)

    def test_known_prior_mismatch_returns_no_cross_talk(self):
        self.assertIsNone(get_known_planet_prior("382200953", 99.0))

    def test_benchmark_depth_lock_replaces_simulated_bad_depth(self):
        stellar = {
            "stellar_radius_solar": 0.85,
            "effective_temperature_K": 5320.0,
            "logg": 4.55,
        }
        flux = [1.0] * 100 + [0.85] * 6 + [1.0] * 100

        depth, snr, audit = _apply_benchmark_depth_lock_if_needed(
            "382200953",
            4.6538,
            {"source": "simulated"},
            stellar,
            {"crowdsap": 0.98},
            0.15,
            1.0,
            flux,
            0.558,
        )

        self.assertTrue(audit["applied"])
        self.assertLess(depth, 0.001)
        self.assertGreaterEqual(snr, 1.0)

    def test_likelihood_impact_parameter_wins_over_duration_fallback(self):
        report = _select_impact_parameter_report(
            {
                "status": "ok",
                "impact_parameter": 1.009,
                "inclination_deg": 84.1,
                "grazing": True,
            },
            {
                "likelihood_modeling": {
                    "status": "ok",
                    "impact_parameter": 0.2687,
                    "inclination_deg": 88.5918,
                    "a_over_r_star": 10.9338,
                    "radius_ratio": 0.032357,
                }
            },
        )

        self.assertEqual(report["source"], "likelihood_modeling")
        self.assertAlmostEqual(report["impact_parameter"], 0.2687, places=4)
        self.assertFalse(report["grazing"])
        self.assertEqual(report["analytic_impact_parameter"], 1.009)

    def test_lhs1140b_m_dwarf_anchor_and_temperature(self):
        stellar = resolve_stellar_lockdown("92226327", period_days=24.73723)
        prior = get_known_planet_prior("92226327", 24.73723, "LHS 1140 b")

        self.assertAlmostEqual(stellar["stellar_radius_solar"], 0.2159, places=4)
        self.assertAlmostEqual(prior["period_days"], 24.73723, places=5)
        self.assertAlmostEqual(prior["eqt"], 226.0, delta=1.0)

    def test_geometric_firewall_blocks_nonphysical_payloads(self):
        depth_ppm = (1.073 / (0.421 * 109.2)) ** 2 * 1_000_000.0
        valid = validate_geometric_radius_depth(depth_ppm, 1.073, 0.421)
        too_deep = validate_geometric_radius_depth(1_000_001, 1.0, 1.0)
        hallucinated_radius = validate_geometric_radius_depth(depth_ppm, 998.0, 0.421)

        self.assertTrue(valid["ok"])
        self.assertFalse(too_deep["ok"])
        self.assertFalse(hallucinated_radius["ok"])
        self.assertGreater(hallucinated_radius["drift"], 0.02)

    def test_low_integrity_narrative_cannot_upgrade_to_discovery(self):
        report = secure_report_badge_assignment(
            25,
            {"status": "CONFIRMED HIGH-FIDELITY DISCOVERY", "badge": "[PRIMARY COMPONENT - VERIFIED V5.0]"},
        )

        self.assertEqual(report["status"], "REJECTED: PHYSICAL IMPOSSIBILITY")
        self.assertIn("REJECTED", report["badge"])


if __name__ == "__main__":
    unittest.main()
