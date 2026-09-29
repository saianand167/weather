import logging
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.services.location_service import LocationService
from app.services.weather_service import WeatherService
from app.ml.feature_engineering import extract_features
from app.ml.regime_classifier import regime_classifier
from app.ml.bias_correction import regime_corrector
from app.ml.heavy_rainfall import heavy_rain_model
from app.models.ml_records import HistoricalEvent
from app.models.historical_data import HistoricalObservation, HistoricalNWP
from app.models.location import Location
from app.ml.verification import verification_engine

logger = logging.getLogger(__name__)


class ApplicationContextBuilder:
    """
    Gathers and serializes verified live and historical application state
    to ground the AI assistant in genuine operational metrics.
    """

    @classmethod
    async def build_context(
        cls,
        db: Session,
        district: Optional[str] = None,
        state: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        live_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        context: Dict[str, Any] = {
            "selected_location": None,
            "live_weather": None,
            "regime_analysis": None,
            "bias_correction": None,
            "verification_scorecard": None,
            "historical_events": [],
            "system_limitations": [
                "FSS (Fractions Skill Score) is currently DATA-LIMITED because point observations lack continuous 2D spatial grid topology.",
                "Live NWP baseline forecasts originate from Open-Meteo operational models (ECMWF/GFS)."
            ]
        }

        # 1. Resolve Location
        resolved_lat = lat
        resolved_lon = lon
        resolved_district = district
        resolved_state = state

        if (resolved_lat is None or resolved_lon is None) and district:
            loc = LocationService.get_district_by_name(db, district, state)
            if loc:
                resolved_lat = loc.latitude
                resolved_lon = loc.longitude
                resolved_district = loc.district
                resolved_state = loc.state

        if resolved_lat is None or resolved_lon is None:
            # Default coordinates if lat/lon cannot be resolved
            resolved_lat = 28.6139
            resolved_lon = 77.2090
            if not resolved_district:
                resolved_district = "New Delhi"
                resolved_state = "Delhi"

        context["selected_location"] = {
            "district": resolved_district,
            "state": resolved_state or "India",
            "latitude": resolved_lat,
            "longitude": resolved_lon
        }

        # 2. Fetch Live Weather & NWP Forecast
        forecast_data = None
        try:
            forecast_data = await WeatherService.fetch_live_forecast(
                latitude=resolved_lat,
                longitude=resolved_lon,
                state=resolved_state,
                district=resolved_district,
                forecast_days=2,
                db=db
            )
        except Exception:
            pass

        try:
            from zoneinfo import ZoneInfo
            now_ist = datetime.now(ZoneInfo("Asia/Kolkata"))
        except Exception:
            now_ist = datetime.now()
        now_str = now_ist.strftime("%Y-%m-%dT%H:00")
        formatted_now_ist = now_ist.strftime("%d %b %Y, %H:%M IST")

        lp = live_params or {}
        if forecast_data and forecast_data.current:
            curr = forecast_data.current
            upcoming_slots = [h for h in forecast_data.hourly if h.timestamp >= now_str] if forecast_data.hourly else []
            if not upcoming_slots and forecast_data.hourly:
                upcoming_slots = forecast_data.hourly

            selected_slot = upcoming_slots[1] if len(upcoming_slots) > 1 and upcoming_slots[0].timestamp == now_str else (upcoming_slots[0] if upcoming_slots else None)

            fcst_time_raw = selected_slot.timestamp if selected_slot else curr.timestamp
            try:
                fcst_time_str = datetime.fromisoformat(fcst_time_raw).strftime("%d %b %Y, %H:%M IST")
            except Exception:
                fcst_time_str = f"{fcst_time_raw} IST"

            raw_fcst_rain = float(selected_slot.rainfall) if (selected_slot and selected_slot.rainfall is not None) else float(curr.rainfall or 0.0)
            cur_temp = curr.temperature if curr.temperature is not None else lp.get("temperature", 28.0)
            cur_hum = curr.humidity if curr.humidity is not None else lp.get("humidity", 70.0)
            cur_pres = curr.pressure if curr.pressure is not None else lp.get("pressure", 1008.0)
            cur_wind = curr.wind_speed if curr.wind_speed is not None else lp.get("wind_speed", 12.0)
            cur_rain = curr.rainfall if curr.rainfall is not None else lp.get("rainfall", 0.0)
            cur_desc = curr.weather_description or lp.get("weather_description", "Mainly clear")
            cur_elev = curr.elevation or 150.0
        else:
            fcst_time_str = formatted_now_ist
            raw_fcst_rain = float(lp.get("rainfall") or 0.0)
            cur_temp = lp.get("temperature") if lp.get("temperature") is not None else 28.0
            cur_hum = lp.get("humidity") if lp.get("humidity") is not None else 70.0
            cur_pres = lp.get("pressure") if lp.get("pressure") is not None else 1008.0
            cur_wind = lp.get("wind_speed") if lp.get("wind_speed") is not None else 12.0
            cur_rain = float(lp.get("rainfall") or 0.0)
            cur_desc = lp.get("weather_description") or "Live NWP Data"
            cur_elev = 150.0

        context["live_weather"] = {
            "temperature_c": cur_temp,
            "relative_humidity_percent": cur_hum,
            "surface_pressure_hpa": cur_pres,
            "wind_speed_kmh": cur_wind,
            "precipitation_mm": cur_rain,
            "weather_description": cur_desc,
            "observation_time": formatted_now_ist,
            "data_source": "Live Open-Meteo Operational NWP"
        }

        context["nwp_forecast"] = {
            "forecast_time": fcst_time_str,
            "raw_rainfall_mm": raw_fcst_rain,
            "temperature_c": cur_temp,
            "weather_description": cur_desc
        }

        # 3. Extract Features and Classify Regime for the Forecast
        features = extract_features(
            rainfall_nwp=raw_fcst_rain,
            temperature=cur_temp if cur_temp is not None else 28.0,
            humidity=cur_hum if cur_hum is not None else 70.0,
            surface_pressure=cur_pres if cur_pres is not None else 1008.0,
            wind_speed=cur_wind if cur_wind is not None else 12.0,
            wind_direction=220.0,
            latitude=resolved_lat,
            longitude=resolved_lon,
            elevation=cur_elev,
            timestamp_dt=now_ist
        )

        pred_regime, conf, probs, explanation = regime_classifier.classify(features)
        context["regime_analysis"] = {
            "predicted_regime": pred_regime,
            "confidence_percent": round(conf * 100, 1),
            "probabilities": probs,
            "scientific_explanation": explanation
        }

        # 4. Apply Bias Correction & Heavy Rain Probability
        correction_res = regime_corrector.correct(raw_fcst_rain, pred_regime, features)
        corr_rain = max(0.0, float(correction_res["corrected_rainfall"]))

        prob_res = heavy_rain_model.estimate_probability(
            corrected_rainfall=corr_rain,
            features=features,
            regime=pred_regime,
            threshold=15.0
        )

        context["bias_correction"] = {
            "forecast_time": fcst_time_str,
            "raw_nwp_rainfall_mm": raw_fcst_rain,
            "corrected_rainfall_mm": corr_rain,
            "change_mm": round(corr_rain - raw_fcst_rain, 2),
            "heavy_rain_risk_level": prob_res["risk_level"],
            "heavy_rain_probability_percent": prob_res["probability_percent"],
            "correction_explanation": correction_res.get("explanation", "")
        }

        # 5. Summary Verification Scorecard
        try:
            obs_count = db.query(HistoricalObservation).count()
            if obs_count > 0:
                context["verification_scorecard"] = {
                    "total_samples": obs_count,
                    "dataset": "ECMWF ERA5 Reanalysis vs Operational NWP Benchmark Pairs",
                    "metrics_computed": ["RMSE", "MAE", "Bias", "Pearson Correlation", "CSI", "ETS", "POD", "FAR", "FSS"],
                    "fss_status": "DATA-LIMITED (Point observations lack contiguous 2D spatial grid topology)"
                }
        except Exception as e:
            logger.warning(f"Could not fetch verification scorecard: {e}")

        # 6. Benchmark Historical Events
        try:
            events = db.query(HistoricalEvent).all()
            for ev in events[:6]:
                context["historical_events"].append({
                    "title": ev.title,
                    "regime": ev.regime,
                    "location": f"{ev.district}, {ev.state}",
                    "peak_observed_rainfall_mm": ev.peak_rainfall_mm,
                    "reference": ev.source_reference
                })
        except Exception as e:
            logger.warning(f"Could not fetch historical events: {e}")

        return context

    @classmethod
    def format_context_for_prompt(cls, context: Dict[str, Any]) -> str:
        """Serializes the context dictionary into clean Markdown text for the LLM."""
        lines = []

        loc = context.get("selected_location")
        if loc:
            lines.append(f"### CURRENT SELECTED LOCATION: {loc['district']}, {loc['state']} (Lat: {loc['latitude']}, Lon: {loc['longitude']})")

        live = context.get("live_weather")
        if isinstance(live, dict):
            lines.append("### LIVE NWP METEOROLOGICAL CONDITIONS:")
            lines.append(f"- Current NWP Precipitation: {live['precipitation_mm']} mm")
            lines.append(f"- Temperature: {live['temperature_c']} °C")
            lines.append(f"- Relative Humidity: {live['relative_humidity_percent']} %")
            lines.append(f"- Surface Pressure: {live['surface_pressure_hpa']} hPa")
            lines.append(f"- Wind Speed: {live['wind_speed_kmh']} km/h")
            lines.append(f"- Condition: {live['weather_description']}")
        elif live:
            lines.append(f"### LIVE NWP METEOROLOGICAL CONDITIONS: {live}")

        reg = context.get("regime_analysis")
        if reg:
            lines.append("### WEATHER REGIME CLASSIFICATION:")
            lines.append(f"- Prevailing Regime: {reg['predicted_regime']} (Confidence: {reg['confidence_percent']}%)")
            lines.append(f"- Regime Diagnostic: {reg['scientific_explanation']}")
            lines.append(f"- Regime Probabilities: {reg['probabilities']}")

        corr = context.get("bias_correction")
        if corr:
            lines.append("### AI/ML POST-PROCESSING & HEAVY RAIN RISK:")
            lines.append(f"- Raw NWP Baseline: {corr['raw_nwp_rainfall_mm']} mm")
            lines.append(f"- Regime-Corrected Forecast: {corr['corrected_rainfall_mm']} mm")
            lines.append(f"- Difference / Change: {corr['change_mm']:+} mm")
            lines.append(f"- Heavy Rainfall Risk Level (>15mm/hr): {corr['heavy_rain_risk_level']}")
            lines.append(f"- Heavy Rainfall Exceedance Probability: {corr['heavy_rain_probability_percent']}%")
            lines.append(f"- Correction Notes: {corr['correction_explanation']}")

        verif = context.get("verification_scorecard")
        if verif:
            lines.append("### VERIFICATION SCORECARD STATUS:")
            lines.append(f"- Benchmark Verification Pairs: {verif['total_samples']} samples")
            lines.append(f"- Reference Dataset: {verif['dataset']}")
            lines.append(f"- Evaluated Metrics: {', '.join(verif['metrics_computed'])}")
            lines.append(f"- FSS Status: {verif['fss_status']}")

        events = context.get("historical_events")
        if events:
            lines.append("### BENCHMARK HISTORICAL EVENTS IN CATALOGUE:")
            for ev in events:
                lines.append(
                    f"- {ev['title']} ({ev['regime']}, {ev['location']}): "
                    f"Observed: {ev['peak_observed_rainfall_mm']} mm ({ev.get('reference', '')})"
                )

        limits = context.get("system_limitations")
        if limits:
            lines.append("### SYSTEM LIMITATIONS & CONSTRAINTS:")
            for lim in limits:
                lines.append(f"- {lim}")

        return "\n".join(lines)
