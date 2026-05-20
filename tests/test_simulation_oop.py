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
import numpy as np
from exohunter.simulation import BayesianPipelineDirector

def test_bayesian_pipeline_math_closure(mocker):
    """
    Tests that the Pipeline Director correctly converts fractional radius (p)
    into Earth radii and strictly adheres to the geometric depth closure law.
    """
    # 1. Mock the heavy Juliet/Dynesty process so tests run in 0.1 seconds
    mocker.patch('exohunter.simulation.LightcurveIngestor.fetch_and_clean', return_value=([], [], []))
    mocker.patch('exohunter.simulation.WotanDetrender.apply', return_value=[])
    
    # Mock reverse_ichamp to return a fixed radius ratio (p = 0.05) and impact (b = 0)
    mock_juliet_utils.reverse_ichamp.return_value = ([0.05], [0.0])
    
    # Mock Juliet dataset fit
    mock_fit = MagicMock()
    mock_fit.posteriors = {'posterior_samples': {}}
    mock_dataset = MagicMock()
    mock_dataset.fit.return_value = mock_fit
    mock_juliet.load.return_value = mock_dataset

    # 2. Execute Director
    stellar_context = {"stellar_radius_solar": 1.0}
    director = BayesianPipelineDirector("999999", 5.0, 1000.0, 2.0, stellar_context)
    payload = director.execute()

    # 3. Assert Mathematical Truth
    # If p = 0.05, Depth should be (0.05^2) * 1,000,000 = 2500 ppm
    assert payload["transit_depth_ppm"] == pytest.approx(2500.0)
    
    # If p = 0.05 and R* = 1.0, R_planet = 0.05 * 1.0 * 109.2 = 5.46 R_earth
    assert payload["planet_radius_earth"] == pytest.approx(5.46)
