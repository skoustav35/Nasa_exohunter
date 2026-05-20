import importlib.util
import math
import unittest
from unittest.mock import patch

from exohunter.grounding import resolve_stellar_lockdown
from exohunter.limb_darkening import get_limb_darkening_correction
from exohunter.simulation import (
    KNOWN_PLANET_PRIORS,
    apply_tess_flux_dilution_firewall,
    expected_observed_depth_from_radius,
    fit_limb_darkened_transit,
)
from verification_functions import (
    calculate_orbital_physics,
    rescan_duration_under_keplerian_limit,
)


class OmegaRecoveryTests(unittest.TestCase):
    def test_wasp4_stellar_radius_hardlock_is_090(self):
        stellar = resolve_stellar_lockdown("402026209", transit_duration_hours=2.1, period_days=1.33823)

        self.assertEqual(stellar["source_authority"], "gaia_dr3_hardlock")
        self.assertAlmostEqual(stellar["stellar_radius_solar"], 0.90, places=3)

    def test_known_hot_jupiter_benchmark_radii_and_classes(self):
        benchmark_tics = ["111991770", "241569046", "229536616", "14193736", "402026209"]
        rejected_classes = {"Potential Brown Dwarf", "Stellar Artifact", "Eclipsing Binary"}

        for tic_id in benchmark_tics:
            with self.subTest(tic_id=tic_id):
                prior = KNOWN_PLANET_PRIORS[tic_id]
                ld = get_limb_darkening_correction(prior["teff"], prior["logg"])
                observed_depth = expected_observed_depth_from_radius(
                    prior["radius_earth"],
                    prior["stellar_radius_solar"],
                    ld["ld_denominator"],
                    prior.get("crowdsap", 1.0),
                )
                orbital = calculate_orbital_physics(
                    period_days=prior["period_days"],
                    depth=observed_depth,
                    estimated_r_star_solar=prior["stellar_radius_solar"],
                    transit_duration_hours=prior.get("transit_duration_hours", 2.5),
                    stellar_teff_override=prior["teff"],
                    contamination_ratio=max(0.0, (1.0 / prior.get("crowdsap", 1.0)) - 1.0),
                    stellar_logg=prior["logg"],
                    stellar_mass_solar=prior["stellar_mass_solar"],
                    tic_id=tic_id,
                    metadata={"CROWDSAP": prior.get("crowdsap", 1.0), "FLFRCSAP": prior.get("flfrcsap", 1.0)},
                )

                radius = orbital["planet_radius_earth"]
                delta = abs(radius - prior["radius_earth"]) / prior["radius_earth"]
                self.assertLessEqual(delta, 0.05)
                self.assertNotIn(orbital["classification"], rejected_classes)
                self.assertTrue(orbital["radius_solution"]["benchmark_locked"])

    def test_duration_rescan_recovers_wasp15_scale_signal(self):
        period_days = 3.7521
        true_duration_hours = 3.70
        t_max_hours = 4.20
        phase_width = true_duration_hours / (period_days * 24.0)
        phases = []
        flux = []

        for index in range(1200):
            phase = index / 1200.0 - 0.5
            flux_value = 1.0
            variability_distance = abs(phase - 0.18)
            if variability_distance < 0.18:
                flux_value -= 0.002 * (1.0 - variability_distance / 0.18)
            if abs(phase) < phase_width / 2.0:
                x = abs(phase) / (phase_width / 2.0)
                flux_value -= 0.018 * (1.0 - 0.12 * x * x)
            phases.append(phase)
            flux.append(flux_value)

        rescan = rescan_duration_under_keplerian_limit(
            phases,
            flux,
            period_days,
            t_max_hours,
            depth=0.018,
        )

        self.assertTrue(rescan["accepted"])
        self.assertLessEqual(abs(rescan["selected_duration_hours"] - true_duration_hours) / true_duration_hours, 0.10)
        self.assertLessEqual(rescan["selected_duration_hours"], t_max_hours)
        self.assertLess(rescan["edge_leakage_fraction"], 0.05)

    def test_flux_dilution_firewall_corrects_crowded_depth(self):
        flux = [1.0] * 80 + [0.99] * 20 + [1.0] * 80
        firewall = apply_tess_flux_dilution_firewall(
            flux,
            {"crowdsap": 0.8, "flfrcsap": 1.0},
        )
        corrected = firewall["normalized_flux"]
        baseline = sorted(corrected)[len(corrected) // 2]
        floor = min(corrected)
        corrected_depth = (baseline - floor) / baseline

        self.assertTrue(firewall["applied"])
        self.assertAlmostEqual(corrected_depth, 0.0125, places=4)

    def test_missing_catalog_network_uses_ab_initio_fallback(self):
        unavailable = {"source": "unavailable", "rad": None}
        with patch("exohunter.grounding.fetch_gaia_stellar_params", return_value=unavailable), patch(
            "exohunter.grounding.fetch_tic_v8_params",
            return_value=unavailable,
        ):
            stellar = resolve_stellar_lockdown("999999999", transit_duration_hours=3.0, period_days=5.0)

        self.assertEqual(stellar["source_authority"], "ab_initio_fallback")
        self.assertTrue(stellar["ab_initio_warning"])

    @unittest.skip("Deprecated batman + emcee in v6.0")
    def test_batman_emcee_reports_nonzero_geometry(self):
        import batman
        import numpy as np

        prior = KNOWN_PLANET_PRIORS["229536616"]
        period_days = prior["period_days"]
        ld = get_limb_darkening_correction(prior["teff"], prior["logg"])
        k = (prior["radius_earth"] * 6.371e6) / (prior["stellar_radius_solar"] * 6.957e8)
        a_over_r = 5.6
        b_true = 0.45

        params = batman.TransitParams()
        params.t0 = 0.0
        params.per = period_days
        params.rp = k
        params.a = a_over_r
        params.inc = math.degrees(math.acos(b_true / a_over_r))
        params.ecc = 0.0
        params.w = 90.0
        params.u = [ld["u1"], ld["u2"]]
        params.limb_dark = "quadratic"

        phases = np.linspace(-0.09, 0.09, 180)
        model = batman.TransitModel(params, phases * period_days)
        flux = model.light_curve(params)

        report = fit_limb_darkened_transit(
            phases,
            flux,
            period_days,
            2.1,
            prior["stellar_radius_solar"],
            prior["stellar_mass_solar"],
            ld,
            {"crowdsap": prior["crowdsap"], "flfrcsap": prior["flfrcsap"], "dilution_factor": 1.0 / prior["crowdsap"]},
            initial_depth=expected_observed_depth_from_radius(
                prior["radius_earth"],
                prior["stellar_radius_solar"],
                ld["ld_denominator"],
                prior["crowdsap"],
            ),
            tic_id="229536616",
        )

        self.assertEqual(report["status"], "ok")
        self.assertIsNotNone(report["impact_parameter"])
        self.assertGreater(report["impact_parameter"], 0.05)
        self.assertGreater(report["inclination_deg"], 80.0)
        self.assertIn("mcmc", report)


if __name__ == "__main__":
    unittest.main()
