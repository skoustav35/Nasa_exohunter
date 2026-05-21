import sys
from unittest.mock import MagicMock

# Mock the heavy/unavailable packages in the environment
mock_juliet = MagicMock()
mock_juliet_utils = MagicMock()
mock_juliet.utils = mock_juliet_utils
sys.modules['juliet'] = mock_juliet
sys.modules['juliet.utils'] = mock_juliet_utils

mock_wotan = MagicMock()
sys.modules['wotan'] = mock_wotan

import pytest
from exohunter.simulation import BayesianPipelineDirector

def test_bayesian_pipeline_math_closure(mocker):
    """Verifies that fractional radius converts accurately and adheres to geometric depth rules."""
    mocker.patch('exohunter.simulation.LightcurveIngestor.fetch_and_clean', return_value=([], [], []))
    mocker.patch('exohunter.simulation.WotanDetrender.apply', return_value=([], 0.0, 1.0))
    mocker.patch('juliet.utils.reverse_ichamp', return_value=([0.05], [0.0]))
    
    mock_fit = mocker.MagicMock()
    mock_fit.posteriors = {'posterior_samples': {}}
    mock_dataset = mocker.MagicMock()
    mock_dataset.fit.return_value = mock_fit
    mocker.patch('juliet.load', return_value=mock_dataset)

    stellar_context = {"stellar_radius_solar": 1.0, "benchmark_locked": False}
    director = BayesianPipelineDirector("463402815", 5.0, 1000.0, 2.0, stellar_context)
    payload = director.execute()

    # Assertions: if p = 0.05, Depth must equal (0.05^2) * 1,000,000 = 2500 ppm
    assert payload["transit_depth_ppm"] == pytest.approx(2500.0)
    # R_planet = 0.05 * 1.0 * 109.2 = 5.46 R_earth
    assert payload["planet_radius_earth"] == pytest.approx(5.46)
