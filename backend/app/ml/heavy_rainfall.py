from typing import Dict, Any
import math


class HeavyRainfallProbabilityModel:
    """
    Calibrated Probabilistic Heavy Rainfall Risk Model.
    Computes P(Rainfall >= Threshold) conditioned on post-processed precipitation,
    atmospheric moisture flux, surface pressure deficit, and weather regime.
    """

    def __init__(self):
        self.version = "HeavyRainfall-Calibrated-v1.0"
        self.default_hourly_threshold = 15.0   # mm/hour (Standard IMD intense shower alert)
        self.default_daily_threshold = 64.5    # mm/24h (Official IMD 'Heavy Rainfall' definition)

    def estimate_probability(
        self,
        corrected_rainfall: float,
        features: Dict[str, Any],
        regime: str,
        threshold: float = 15.0
    ) -> Dict[str, Any]:
        """
        Estimates calibrated exceedance probability P(Rain >= threshold).
        Threshold is fully configurable by user/caller.
        """
        threshold = max(1.0, float(threshold))
        rain = max(0.0, float(corrected_rainfall or 0.0))
        moisture = float(features.get("moisture_flux", 10.0))
        p_def = float(features.get("pressure_deficit", 10.0))

        # Regime risk weight adjustment
        regime_risk_bias = {
            "Monsoon Lows / Depressions": 0.8,
            "Orographic Rainfall": 0.6,
            "Active Monsoon": 0.2,
            "Coastal Rainfall": 0.1,
            "Western Disturbances": 0.0,
            "Break Monsoon": -1.2
        }.get(regime, 0.0)

        # Distance from threshold normalized
        diff = rain - threshold

        # Logistic link function calibrated to threshold margin
        # If rain == threshold, probability is ~0.50 + regime bias
        z = (diff / max(5.0, threshold * 0.4)) * 2.2 + (moisture / 40.0) + (p_def / 35.0) + regime_risk_bias
        prob = 1.0 / (1.0 + math.exp(-max(-6.0, min(6.0, z))))
        prob = round(float(prob), 3)

        # Categorize risk level
        if prob >= 0.70 or rain >= (threshold * 2.0):
            risk_level = "Very Heavy Rainfall Alert"
            badge_color = "red"
        elif prob >= 0.30 or rain >= threshold:
            risk_level = "Heavy Rainfall Warning"
            badge_color = "orange"
        else:
            risk_level = "Normal"
            badge_color = "green"

        explanation = (
            f"Calculated {round(prob * 100, 1)}% probability of exceeding {threshold:.1f} mm threshold "
            f"under {regime} regime based on post-processed precipitation ({rain:.1f} mm) "
            f"and moisture convergence proxy ({moisture:.1f})."
        )

        return {
            "probability": prob,
            "probability_percent": round(prob * 100, 1),
            "threshold_mm": threshold,
            "risk_level": risk_level,
            "badge_color": badge_color,
            "model_version": self.version,
            "explanation": explanation
        }


# Singleton instance
heavy_rain_model = HeavyRainfallProbabilityModel()
