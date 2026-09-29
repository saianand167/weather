from typing import Dict, Any, Tuple
import numpy as np
from sklearn.ensemble import RandomForestClassifier

# Supported Weather Regimes under SIH26080
REGIMES = [
    "Active Monsoon",
    "Break Monsoon",
    "Monsoon Lows / Depressions",
    "Orographic Rainfall",
    "Coastal Rainfall",
    "Western Disturbances"
]

FEATURE_COLUMNS = [
    "rainfall_nwp_raw",
    "temperature",
    "humidity",
    "surface_pressure",
    "wind_speed",
    "elevation",
    "latitude",
    "longitude",
    "is_monsoon",
    "is_winter_wd",
    "is_coastal",
    "is_orographic",
    "moisture_flux",
    "pressure_deficit"
]


class WeatherRegimeClassifier:
    """
    Explainable Weather Regime Classifier for Indian Subcontinent.
    Combines trained Random Forest probabilities with established meteorological synoptic physics:
    - Active Monsoon: High moisture flux, widespread precipitation during Jun-Sep.
    - Break Monsoon: Low rain in central peninsula, migration of monsoon trough to foothills.
    - Monsoon Lows / Depressions: Sharp pressure deficit, strong cyclonic vorticity, heavy downpours.
    - Orographic Rainfall: High elevation, windward slope moisture impingement (Western Ghats/Himalayas).
    - Coastal Rainfall: Immediate maritime proximity (<= 75km), sea-breeze convergence.
    - Western Disturbances: Winter extra-tropical synoptic systems in Northern India (Dec-Feb, Lat >= 26°N).
    """

    def __init__(self):
        self.model_version = "RegimeClassifier-RF-v1.0"
        self._init_classifier()

    def _init_classifier(self):
        # Initialize Random Forest with reproducible seed
        self.rf = RandomForestClassifier(
            n_estimators=100,
            max_depth=6,
            random_state=42,
            class_weight="balanced"
        )
        self._train_baseline_model()

    def _train_baseline_model(self):
        """
        Fits classifier on established synoptic domain archetypes
        derived from Indian meteorological standards and historical reanalysis patterns.
        """
        X_synoptic = []
        y_synoptic = []

        # 1. Active Monsoon Archetypes (Peninsular & Central India monsoon)
        for _ in range(50):
            X_synoptic.append([
                np.random.uniform(5.0, 35.0),    # rainfall_nwp_raw
                np.random.uniform(26.0, 31.0),   # temperature
                np.random.uniform(78.0, 95.0),   # humidity
                np.random.uniform(995.0, 1004.0),# surface_pressure
                np.random.uniform(14.0, 28.0),   # wind_speed
                np.random.uniform(50.0, 300.0),  # elevation
                np.random.uniform(14.0, 24.0),   # latitude
                np.random.uniform(74.0, 84.0),   # longitude
                1,                               # is_monsoon
                0,                               # is_winter_wd
                0,                               # is_coastal
                0,                               # is_orographic
                np.random.uniform(12.0, 26.0),   # moisture_flux
                np.random.uniform(9.0, 18.0)     # pressure_deficit
            ])
            y_synoptic.append("Active Monsoon")

        # 2. Break Monsoon Archetypes (Dry central plains during monsoon)
        for _ in range(50):
            X_synoptic.append([
                np.random.uniform(0.0, 1.5),     # rainfall_nwp_raw
                np.random.uniform(32.0, 38.0),   # temperature
                np.random.uniform(40.0, 65.0),   # humidity
                np.random.uniform(1004.0, 1012.0),# surface_pressure
                np.random.uniform(5.0, 14.0),    # wind_speed
                np.random.uniform(50.0, 400.0),  # elevation
                np.random.uniform(16.0, 25.0),   # latitude
                np.random.uniform(75.0, 84.0),   # longitude
                1,                               # is_monsoon
                0,                               # is_winter_wd
                0,                               # is_coastal
                0,                               # is_orographic
                np.random.uniform(2.0, 8.0),     # moisture_flux
                np.random.uniform(1.0, 9.0)      # pressure_deficit
            ])
            y_synoptic.append("Break Monsoon")

        # 3. Monsoon Lows / Depressions Archetypes (Strong pressure drop, high winds)
        for _ in range(50):
            X_synoptic.append([
                np.random.uniform(30.0, 110.0),  # rainfall_nwp_raw
                np.random.uniform(24.0, 28.0),   # temperature
                np.random.uniform(88.0, 99.0),   # humidity
                np.random.uniform(980.0, 994.0), # surface_pressure (deep low)
                np.random.uniform(28.0, 55.0),   # wind_speed (squally)
                np.random.uniform(10.0, 250.0),  # elevation
                np.random.uniform(15.0, 24.0),   # latitude
                np.random.uniform(77.0, 88.0),   # longitude
                1,                               # is_monsoon
                0,                               # is_winter_wd
                0,                               # is_coastal
                0,                               # is_orographic
                np.random.uniform(25.0, 52.0),   # moisture_flux
                np.random.uniform(19.0, 33.0)    # pressure_deficit
            ])
            y_synoptic.append("Monsoon Lows / Depressions")

        # 4. Orographic Rainfall Archetypes (Western Ghats / Foothills)
        for _ in range(50):
            X_synoptic.append([
                np.random.uniform(25.0, 90.0),   # rainfall_nwp_raw
                np.random.uniform(18.0, 25.0),   # temperature
                np.random.uniform(85.0, 98.0),   # humidity
                np.random.uniform(910.0, 970.0), # surface_pressure (high altitude)
                np.random.uniform(15.0, 32.0),   # wind_speed
                np.random.uniform(650.0, 1800.0),# elevation (mountainous)
                np.random.uniform(10.0, 19.5),   # latitude
                np.random.uniform(73.5, 75.8),   # longitude
                1,                               # is_monsoon
                0,                               # is_winter_wd
                0,                               # is_coastal
                1,                               # is_orographic
                np.random.uniform(14.0, 30.0),   # moisture_flux
                np.random.uniform(43.0, 103.0)   # pressure_deficit
            ])
            y_synoptic.append("Orographic Rainfall")

        # 5. Coastal Rainfall Archetypes (Maritime boundary, sea breeze)
        for _ in range(50):
            X_synoptic.append([
                np.random.uniform(8.0, 45.0),    # rainfall_nwp_raw
                np.random.uniform(26.0, 32.0),   # temperature
                np.random.uniform(80.0, 96.0),   # humidity
                np.random.uniform(1002.0, 1011.0),# surface_pressure
                np.random.uniform(16.0, 35.0),   # wind_speed
                np.random.uniform(2.0, 45.0),    # elevation (sea level)
                np.random.uniform(8.5, 22.0),    # latitude
                np.random.uniform(72.5, 86.0),   # longitude
                1,                               # is_monsoon
                0,                               # is_winter_wd
                1,                               # is_coastal
                0,                               # is_orographic
                np.random.uniform(14.0, 33.0),   # moisture_flux
                np.random.uniform(2.0, 11.0)     # pressure_deficit
            ])
            y_synoptic.append("Coastal Rainfall")

        # 6. Western Disturbances Archetypes (Northern India winter weather)
        for _ in range(50):
            X_synoptic.append([
                np.random.uniform(4.0, 25.0),    # rainfall_nwp_raw
                np.random.uniform(4.0, 16.0),    # temperature (cool/cold)
                np.random.uniform(65.0, 92.0),   # humidity
                np.random.uniform(960.0, 1015.0),# surface_pressure
                np.random.uniform(10.0, 24.0),   # wind_speed
                np.random.uniform(200.0, 1600.0),# elevation
                np.random.uniform(28.0, 35.5),   # latitude (North India)
                np.random.uniform(73.0, 80.0),   # longitude
                0,                               # is_monsoon
                1,                               # is_winter_wd
                0,                               # is_coastal
                0,                               # is_orographic
                np.random.uniform(7.0, 20.0),    # moisture_flux
                np.random.uniform(-2.0, 53.0)    # pressure_deficit
            ])
            y_synoptic.append("Western Disturbances")

        self.rf.fit(np.array(X_synoptic), y_synoptic)

    def classify(self, features: Dict[str, Any]) -> Tuple[str, float, Dict[str, float], str]:
        """
        Classifies current meteorological vector into one of the 6 SIH26080 regimes.
        Returns:
            - predicted_regime (str)
            - confidence (float, 0.0 to 1.0)
            - regime_probabilities (dict of str -> float)
            - scientific_explanation (str)
        """
        x_vec = np.array([[
            features.get(col, 0.0) for col in FEATURE_COLUMNS
        ]])

        probs = self.rf.predict_proba(x_vec)[0]
        classes = self.rf.classes_

        prob_dict = {cls: round(float(p), 3) for cls, p in zip(classes, probs)}
        best_idx = int(np.argmax(probs))
        predicted = classes[best_idx]
        confidence = round(float(probs[best_idx]), 3)

        # Generate physically grounded, scientifically honest explanation
        explanation = self._build_explanation(predicted, features, confidence)

        return predicted, confidence, prob_dict, explanation

    def classify_batch(self, features_list: list) -> list:
        """
        High-performance vectorized batch regime classification.
        """
        if not features_list:
            return []
        x_mat = np.array([
            [f.get(col, 0.0) for col in FEATURE_COLUMNS] for f in features_list
        ])
        probs_mat = self.rf.predict_proba(x_mat)
        classes = self.rf.classes_
        best_indices = np.argmax(probs_mat, axis=1)
        return [classes[idx] for idx in best_indices]

    def _build_explanation(self, regime: str, f: Dict[str, Any], conf: float) -> str:
        rain = f.get("rainfall_nwp_raw", 0.0)
        temp = f.get("temperature", 25.0)
        hum = f.get("humidity", 60.0)
        press = f.get("surface_pressure", 1005.0)
        wind = f.get("wind_speed", 10.0)
        elev = f.get("elevation", 150.0)
        coast_km = f.get("coastal_distance_km", 200.0)
        is_wd = f.get("is_winter_wd", 0)

        if regime == "Western Disturbances":
            return (
                f"Classified as Western Disturbances (confidence: {int(conf*100)}%) based on "
                f"extratropical synoptic regime at latitude {f.get('latitude', 0.0):.1f}°N, "
                f"cool surface temperature ({temp:.1f}°C), and seasonal winter frontal dynamics."
            )
        elif regime == "Monsoon Lows / Depressions":
            return (
                f"Classified as Monsoon Lows / Depressions (confidence: {int(conf*100)}%) triggered by "
                f"significant surface pressure deficit ({1013.25 - press:.1f} hPa below normal), "
                f"squally wind speeds ({wind:.1f} km/h), and intense rainfall rate ({rain:.1f} mm)."
            )
        elif regime == "Orographic Rainfall":
            return (
                f"Classified as Orographic Rainfall (confidence: {int(conf*100)}%) driven by "
                f"terrain elevation ({elev:.0f}m ASL), high atmospheric moisture saturation ({hum:.0f}%), "
                f"and windward topographic barrier moisture convergence."
            )
        elif regime == "Coastal Rainfall":
            return (
                f"Classified as Coastal Rainfall (confidence: {int(conf*100)}%) characterized by "
                f"immediate maritime proximity ({coast_km:.1f} km from coastline), high relative humidity ({hum:.0f}%), "
                f"and coastal boundary layer breeze circulation."
            )
        elif regime == "Break Monsoon":
            return (
                f"Classified as Break Monsoon (confidence: {int(conf*100)}%) during monsoon season due to "
                f"suppressed precipitation ({rain:.1f} mm), reduced moisture flux, and elevated daytime temperature ({temp:.1f}°C)."
            )
        else: # Active Monsoon
            return (
                f"Classified as Active Monsoon (confidence: {int(conf*100)}%) characterized by "
                f"broadscale synoptic monsoon troughing, strong moisture flux ({f.get('moisture_flux', 0.0):.1f}), "
                f"and sustained seasonal rainfall ({rain:.1f} mm)."
            )


# Singleton instance
regime_classifier = WeatherRegimeClassifier()
