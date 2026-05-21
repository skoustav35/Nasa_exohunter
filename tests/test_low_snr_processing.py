import unittest
from unittest.mock import patch, MagicMock
import sys

# Ensure parent directory is on path
sys.path.insert(0, ".")

from exohunter.grounding import TargetContext
from exohunter.anomaly_engines import deploy_autonomous_sub_engine_matrix
from verification_functions import run_full_physical_profile

class LowSNRProcessingTests(unittest.TestCase):
    @patch("exohunter.anomaly_engines.analyze_centroid_shift")
    def test_anomaly_engines_bypass_force_rejection_on_low_snr(self, mock_centroid_shift):
        """
        Verify that Engine_Asymmetry_Evaluator and Engine_Centroid_Drift_Evaluator
        do NOT set force_rejection_reason when SNR is low (< 6.0), and instead log warning messages.
        """
        # Mock centroid shift to be flagged
        mock_centroid_shift.return_value = {
            "flagged": True,
            "status": "success",
            "shift_pixels": 0.8,
            "assessment": "High centroid offset detected."
        }

        # Set up a target context and light curve data with low SNR (< 6.0)
        # and anomalies triggered (odd/even inconsistent, centroid flagged).
        target_context = {
            "tic_id": "123456",
            "period_days": 5.0,
            "snr": 4.5,  # Low SNR
            "anomaly_engine_audit": []
        }
        
        light_curve_data = {
            "snr": 4.5,
            "dilution": {"crowdsap": 1.0, "flfrcsap": 1.0},
            "odd_even": {
                "odd_even_consistent": False,
                "odd_depth": 0.015,
                "even_depth": 0.005,
            },
            "centroid_report": {
                "flagged": True,
                "status": "success",
                "shift_pixels": 0.8,
                "assessment": "High centroid offset detected."
            },
            "phase": [0.0, 0.1, 0.2],
            "flux": [1.0, 1.0, 1.0],
            "metadata": {
                "centroid_x": [0.0, 0.1, 0.2],
                "centroid_y": [0.0, 0.1, 0.2],
            },
            "period_days": 5.0,
            "duration_hours": 2.0,
        }
        
        # Deploy matrix directly
        updated_context = deploy_autonomous_sub_engine_matrix(target_context, light_curve_data)
        
        # Verify force_rejection_reason is NOT set
        self.assertNotIn("force_rejection_reason", updated_context)
        
        # Verify that warning audits are appended
        audit_engines = [audit["engine"] for audit in updated_context.get("anomaly_engine_audit", [])]
        self.assertIn("Engine_Asymmetry_Evaluator_WARNING", audit_engines)
        self.assertIn("Engine_Centroid_Drift_Evaluator_WARNING", audit_engines)
        
        # Double check note content to ensure bypass messages are present
        warnings = [
            audit for audit in updated_context["anomaly_engine_audit"] 
            if "WARNING" in audit["engine"]
        ]
        self.assertTrue(any("force-rejection bypassed due to low SNR" in w.get("note", "") for w in warnings))

    @patch("verification_functions.enforce_isolated_target_lookup")
    @patch("verification_functions._load_best_light_curve_bundle")
    @patch("verification_functions.preprocess_light_curve")
    @patch("verification_functions.calculate_snr")
    @patch("verification_functions.verify_tic_identity")
    @patch("verification_functions.resolve_stellar_lockdown")
    @patch("verification_functions.extract_tess_dilution")
    @patch("verification_functions.apply_tess_flux_dilution_firewall")
    @patch("verification_functions.check_depth_sanity")
    @patch("verification_functions.analyze_transit_shape")
    @patch("verification_functions.estimate_impact_parameter")
    @patch("verification_functions.search_secondary_eclipse")
    @patch("verification_functions.analyze_centroid_shift")
    @patch("verification_functions.run_independent_cognitive_protocol")
    @patch("verification_functions.analyze_transit_timing_variations")
    @patch("verification_functions.calculate_orbital_physics")
    def test_run_full_physical_profile_softens_low_snr_rejection(
        self,
        mock_calc_orbital,
        mock_ttv,
        mock_ind_protocol,
        mock_centroid_shift,
        mock_sec_eclipse,
        mock_impact,
        mock_shape,
        mock_depth_sanity,
        mock_flux_firewall,
        mock_dilution,
        mock_stellar_lockdown,
        mock_verify_identity,
        mock_calc_snr,
        mock_preprocess,
        mock_load_bundle,
        mock_enforce_lookup
    ):
        """
        Verify that run_full_physical_profile processes a low SNR target (SNR < 6.0)
        without rejecting it as "Rejected: Physical Impossibility" or capping physical integrity at 20.
        Instead, it should log an SNR Audit Warning.
        """
        tic_id = "999999"
        period = 5.0
        
        # Setup mocks
        mock_enforce_lookup.return_value = TargetContext(
            tic_id=tic_id,
            claimed_name=None,
            measured_period_days=period,
            verified_name=None,
            identity_verified=True,
            benchmark_prior=None
        )
        
        mock_load_bundle.return_value = {
            "time": [1.0, 2.0, 3.0],
            "flux": [1.0, 1.0, 1.0],
            "metadata": {},
            "lightcurve": None,
            "multi_sector": {"status": "skipped_to_prevent_timeout"},
            "sector_series": []
        }
        
        mock_preprocess.return_value = {
            "status": "success",
            "time": [1.0, 2.0, 3.0],
            "flux": [1.0, 1.0, 1.0],
            "cdpp": {"cdpp_ppm": 100.0}
        }
        
        # Return depth=0.01, SNR=4.5 (which is < 6.0)
        mock_calc_snr.return_value = (0.01, 4.5)
        
        mock_verify_identity.return_value = {"identity_verified": True}
        
        mock_stellar_lockdown.return_value = {
            "effective_temperature_K": 5800.0,
            "stellar_radius_solar": 1.0,
            "logg": 4.4,
            "source_authority": "gaia"
        }
        
        mock_dilution.return_value = {"crowdsap": 1.0, "flfrcsap": 1.0}
        mock_flux_firewall.return_value = {"status": "ok", "normalized_flux": [1.0, 1.0, 1.0]}
        mock_depth_sanity.return_value = {"alert": False}
        mock_shape.return_value = {"shape": "U-shape", "u_shape_score": 1.0}
        mock_impact.return_value = {"impact_parameter": 0.2, "grazing": False}
        mock_sec_eclipse.return_value = {"detected": False}
        mock_centroid_shift.return_value = {"flagged": False, "status": "ok"}
        mock_ind_protocol.return_value = {"override_reject": False}
        mock_ttv.return_value = {"status": "unavailable", "transits": []}
        
        mock_calc_orbital.return_value = {
            "planet_radius_earth": 2.0,
            "planet_radius_observed_earth": 2.0,
            "transit_depth_ppm": 10000.0,
            "observed_transit_depth_ppm": 10000.0,
            "semi_major_axis_au": 0.05,
            "sanity_flags": [],
            "flag_reasons": [],
            "physical_integrity_score": 100.0,
            "classification": "Super-Earth",
            "radius_solution": {"benchmark_locked": False},
            "contamination_correction": {"contamination_ratio": 0.0},
            "equilibrium_temperature_K": 300.0,
            "proximity_correction": {"triggered": False, "proximity_factor": 1.0},
            "likelihood_modeling": {"status": "ok"},
            "dilution_audit": {"crowdsap": 1.0, "flfrcsap": 1.0},
            "limb_darkening": {"u1": 0.4, "u2": 0.2, "source": "claret"},
            "radius_depth_geometric_check": {"ok": True},
            "composition_guess": "Volatile-rich (Sub-Neptune)",
            "habitability_report": {"habitability_index": 0.0},
        }
        
        # Execute
        result = run_full_physical_profile(tic_id, period)
        
        # Assertions
        # 1. Classification is NOT set to Rejected: Physical Impossibility
        self.assertNotEqual(result.get("validation_status"), "Rejected: Physical Impossibility")
        
        # 2. Integrity score is NOT capped at 20 (it should stay high, e.g. 100.0)
        self.assertGreater(result.get("physical_integrity_score"), 20)
        
        # 3. An "SNR Audit Warning" is appended to the sanity flags
        self.assertIn("SNR Audit Warning", result.get("inferred_orbital", {}).get("sanity_flags", []))
        
        # 4. Confirm the warning message is present in the flag reasons
        flag_reasons = result.get("inferred_orbital", {}).get("flag_reasons", [])
        self.assertTrue(any("Measured SNR (4.50) is below 6.0" in reason for reason in flag_reasons))


if __name__ == "__main__":
    unittest.main()
