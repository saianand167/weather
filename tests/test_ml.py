"""
Tests for Part 2: AI/ML Rainfall Post-Processing and Verification Layer
"""
import os
import sys
import numpy as np
import pytest

# Ensure backend directory is in sys.path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.ml.regime_classifier import WeatherRegimeClassifier
from app.ml.bias_correction import RegimeBiasCorrector
from app.ml.verification import (
    compute_continuous_metrics,
    compute_categorical_metrics,
    compute_fractions_skill_score,
    VerificationEngine
)


def test_regime_classifier_logic():
    classifier = WeatherRegimeClassifier()
    features = {
        "rainfall_nwp_raw": 18.5,
        "temperature": 26.0,
        "humidity": 88.0,
        "surface_pressure": 998.0,
        "wind_speed": 22.0,
        "elevation": 50.0,
        "latitude": 20.5,
        "longitude": 78.5,
        "is_monsoon": 1,
        "is_winter_wd": 0,
        "is_coastal": 0,
        "is_orographic": 0,
        "moisture_flux": 25.0,
        "pressure_deficit": 15.0
    }
    predicted, conf, prob_dict, explanation = classifier.classify(features)
    assert predicted in [
        "Active Monsoon", "Break Monsoon", "Monsoon Lows / Depressions",
        "Orographic Rainfall", "Coastal Rainfall", "Western Disturbances"
    ]
    assert 0.0 <= conf <= 1.0
    assert len(prob_dict) == 6
    assert isinstance(explanation, str)
    assert len(explanation) > 0


def test_bias_correction_logic():
    corrector = RegimeBiasCorrector()
    features = {
        "humidity": 85.0,
        "wind_speed": 18.0,
        "surface_pressure": 1002.0
    }
    res = corrector.correct(
        raw_rainfall=12.0,
        regime="Orographic Rainfall",
        features=features
    )
    assert "raw_rainfall" in res
    assert "corrected_rainfall" in res
    assert "delta" in res
    assert res["corrected_rainfall"] >= 0.0


def test_continuous_metrics_calculation():
    obs = np.array([0.0, 10.0, 25.0, 50.0, 0.0, 5.0, 15.0, 0.0])
    pred = np.array([2.0, 12.0, 20.0, 45.0, 0.0, 0.0, 20.0, 1.0])

    cont = compute_continuous_metrics(obs, pred)
    assert "rmse" in cont
    assert "mae" in cont
    assert "bias" in cont
    assert "correlation" in cont
    assert cont["rmse"] > 0


def test_categorical_metrics_calculation():
    obs = np.array([0.0, 10.0, 25.0, 50.0, 0.0, 5.0, 15.0, 0.0])
    pred = np.array([2.0, 12.0, 20.0, 45.0, 0.0, 0.0, 20.0, 1.0])

    cat = compute_categorical_metrics(obs, pred, threshold=10.0)
    assert "pod" in cat
    assert "far" in cat
    assert "csi" in cat
    assert "ets" in cat
    assert 0.0 <= cat["pod"] <= 1.0
    assert 0.0 <= cat["far"] <= 1.0
    assert 0.0 <= cat["csi"] <= 1.0


def test_fss_calculation():
    obs_grid = np.array([
        [0, 5, 15, 0],
        [10, 20, 25, 5],
        [0, 12, 18, 0],
        [0, 0, 5, 0]
    ], dtype=float)
    fcst_grid = np.array([
        [0, 4, 18, 0],
        [12, 15, 30, 2],
        [0, 10, 16, 0],
        [0, 0, 2, 0]
    ], dtype=float)
    fss, msg = compute_fractions_skill_score(obs_grid, fcst_grid, window_size=3, threshold=10.0)
    assert fss is not None
    assert 0.0 <= fss <= 1.0


def test_verification_engine_evaluation():
    engine = VerificationEngine()
    obs = [0.0, 12.0, 25.0, 30.0, 5.0, 0.0]
    raw = [2.0, 8.0, 20.0, 35.0, 8.0, 1.0]
    corr = [1.0, 11.0, 24.0, 31.0, 5.5, 0.2]
    regimes = ["Active Monsoon"] * 6

    res = engine.evaluate_forecasts(obs, raw, corr, regimes, threshold=10.0)
    assert "raw_nwp" in res
    assert "corrected" in res
    assert "improvements" in res
    assert res["sample_count"] == 6


def test_api_ml_regime_current(client):
    response = client.get("/api/ml/regime/current?lat=13.0827&lon=80.2707&district=Chennai&state=Tamil Nadu")
    assert response.status_code == 200
    data = response.json()
    assert "predicted_regime" in data
    assert "confidence" in data
    assert "probabilities" in data
    assert "explanation" in data


def test_api_ml_correction_predict(client):
    response = client.get("/api/ml/correction/predict?lat=19.0760&lon=72.8777&district=Mumbai&state=Maharashtra")
    assert response.status_code == 200
    data = response.json()
    assert "raw_rainfall_mm" in data
    assert "corrected_rainfall_mm" in data
    assert "regime_used" in data
    assert "heavy_rain_risk_level" in data
    assert "heavy_rain_probability" in data
    assert "model_version" in data


def test_api_ml_events_and_detail(client):
    response = client.get("/api/ml/events")
    assert response.status_code == 200
    events = response.json()
    assert isinstance(events, list)
    assert len(events) >= 6

    # Test event detail for the first event
    first_id = events[0]["id"]
    det_resp = client.get(f"/api/ml/events/{first_id}")
    assert det_resp.status_code == 200
    det = det_resp.json()
    assert det["id"] == first_id
    assert "timeline" in det
    assert len(det["timeline"]) > 0
    assert "regime" in det


def test_api_ml_verification_summary(client):
    response = client.get("/api/ml/verification/summary?threshold=10")
    assert response.status_code == 200
    data = response.json()
    assert "raw_nwp" in data
    assert "corrected" in data
    assert "sample_count" in data
    assert data["sample_count"] > 0
    assert "ets" in data["raw_nwp"]
    assert "csi" in data["raw_nwp"]
    assert "pod" in data["raw_nwp"]
    assert "far" in data["raw_nwp"]
    assert "fss" in data["raw_nwp"]


def test_api_ml_verification_regime_wise(client):
    response = client.get("/api/ml/verification/regime-wise?threshold=10")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    for reg_score in data:
        assert "regime" in reg_score
        assert "samples" in reg_score
        assert "raw_rmse" in reg_score
        assert "corrected_rmse" in reg_score


def test_api_ml_error_analysis(client):
    response = client.get("/api/ml/error-analysis/summary")
    assert response.status_code == 200
    data = response.json()
    assert "samples_analyzed" in data
    assert "rmse_raw" in data
    assert "rmse_corrected" in data
    assert "error_distribution" in data
