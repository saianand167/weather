import math
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.location_service import LocationService
from app.services.weather_service import WeatherService
from app.ml.feature_engineering import extract_features
from app.ml.regime_classifier import regime_classifier
from app.ml.bias_correction import regime_corrector
from app.ml.heavy_rainfall import heavy_rain_model
from app.schemas.ml import CorrectionResponse, HourlyForecastSlot
from app.models.ml_records import CorrectionPrediction

router = APIRouter()


def _format_ist_timestamp(ts_str: str) -> str:
    try:
        dt = datetime.fromisoformat(ts_str)
        return dt.strftime("%d %b %Y, %H:%M IST")
    except Exception:
        return f"{ts_str} IST"


@router.get("/predict", response_model=CorrectionResponse)
async def predict_corrected_rainfall(
    district: Optional[str] = Query(None, description="District name"),
    state: Optional[str] = Query(None, description="State name"),
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude"),
    threshold: float = Query(15.0, ge=1.0, le=200.0, description="Heavy rainfall threshold in mm"),
    target_time: Optional[str] = Query(None, description="Specific forecast timestamp to correct (ISO format)"),
    rainfall_nwp: Optional[float] = Query(None, description="Direct live NWP rainfall value in mm"),
    temperature: Optional[float] = Query(None, description="Direct live temperature in °C"),
    humidity: Optional[float] = Query(None, description="Direct live humidity in %"),
    pressure: Optional[float] = Query(None, description="Direct live surface pressure in hPa"),
    wind_speed: Optional[float] = Query(None, description="Direct live wind speed in km/h"),
    wind_direction: Optional[float] = Query(None, description="Direct live wind direction in degrees"),
    elevation: Optional[float] = Query(None, description="Elevation in meters"),
    db: Session = Depends(get_db)
):
    """
    Applies regime-specific AI/ML post-processing to raw hourly NWP rainfall forecasts.
    1. Fetches live raw NWP hourly forecast for selected location (or uses direct live observations)
    2. Associates prediction with a verified forecast timestamp
    3. Extracts synoptic features for the specific forecast hour
    4. Classifies prevailing weather regime
    5. Applies regime-specific correction estimator
    6. Computes heavy rainfall exceedance probability
    """
    target_lat = lat
    target_lon = lon
    resolved_district = district
    resolved_state = state

    if (target_lat is None or target_lon is None) and district:
        loc = LocationService.get_district_by_name(db, district, state)
        if not loc:
            raise HTTPException(status_code=404, detail=f"District '{district}' not found.")
        target_lat = loc.latitude
        target_lon = loc.longitude
        resolved_district = loc.district
        resolved_state = loc.state

    if target_lat is None or target_lon is None:
        target_lat = 28.6139
        target_lon = 77.2090
        resolved_district = "New Delhi"
        resolved_state = "Delhi"

    forecast = None
    try:
        forecast = await WeatherService.fetch_live_forecast(
            latitude=target_lat,
            longitude=target_lon,
            state=resolved_state,
            district=resolved_district,
            forecast_days=2,
            db=db
        )
    except Exception:
        pass

    # Determine current time in IST to locate upcoming forecast hours
    try:
        from zoneinfo import ZoneInfo
        now_ist = datetime.now(ZoneInfo("Asia/Kolkata"))
    except Exception:
        now_ist = datetime.now()
    now_str = now_ist.strftime("%Y-%m-%dT%H:00")

    upcoming_slots = []
    selected_slot = None

    if forecast and forecast.hourly:
        upcoming_slots = [h for h in forecast.hourly if h.timestamp >= now_str]
        if not upcoming_slots:
            upcoming_slots = forecast.hourly

        if target_time:
            for slot in forecast.hourly:
                if slot.timestamp == target_time:
                    selected_slot = slot
                    break
            if selected_slot is None:
                selected_slot = upcoming_slots[0]
        else:
            if len(upcoming_slots) > 1 and upcoming_slots[0].timestamp == now_str:
                selected_slot = upcoming_slots[1]
            else:
                selected_slot = upcoming_slots[0]

    # If no live hourly slot from weather service, construct from caller parameters or current state
    if selected_slot is None:
        selected_slot_time = target_time or now_str
        raw_rainfall_val = rainfall_nwp if rainfall_nwp is not None else 0.0
        selected_temp = temperature if temperature is not None else 28.0
        selected_hum = humidity if humidity is not None else 70.0
        selected_pres = pressure if pressure is not None else 1008.0
        selected_wind = wind_speed if wind_speed is not None else 12.0
        selected_wind_dir = wind_direction if wind_direction is not None else 220.0
        selected_elev = elevation or 150.0
    else:
        selected_slot_time = selected_slot.timestamp
        raw_rainfall_val = float(selected_slot.rainfall) if selected_slot.rainfall is not None else (rainfall_nwp or 0.0)
        curr = forecast.current if forecast else None
        selected_temp = selected_slot.temperature if selected_slot.temperature is not None else (curr.temperature if curr else (temperature or 28.0))
        selected_hum = selected_slot.humidity if selected_slot.humidity is not None else (curr.humidity if curr else (humidity or 70.0))
        selected_pres = selected_slot.pressure if selected_slot.pressure is not None else (curr.pressure if curr else (pressure or 1008.0))
        selected_wind = selected_slot.wind_speed if selected_slot.wind_speed is not None else (curr.wind_speed if curr else (wind_speed or 12.0))
        selected_wind_dir = selected_slot.wind_direction if selected_slot.wind_direction is not None else (curr.wind_direction if curr else (wind_direction or 220.0))
        selected_elev = (curr.elevation if curr and curr.elevation else None) or elevation or 150.0

    raw_rainfall = max(0.0, float(raw_rainfall_val))

    # Parse timestamp of selected slot
    try:
        slot_dt = datetime.fromisoformat(selected_slot_time)
    except Exception:
        slot_dt = datetime.now()

    features = extract_features(
        rainfall_nwp=raw_rainfall,
        temperature=selected_temp if selected_temp is not None else 28.0,
        humidity=selected_hum if selected_hum is not None else 70.0,
        surface_pressure=selected_pres if selected_pres is not None else 1008.0,
        wind_speed=selected_wind if selected_wind is not None else 12.0,
        wind_direction=selected_wind_dir if selected_wind_dir is not None else 220.0,
        latitude=target_lat,
        longitude=target_lon,
        elevation=selected_elev or 150.0,
        timestamp_dt=slot_dt
    )

    # Step 1: Regime Classification for the forecast conditions
    regime, _, _, _ = regime_classifier.classify(features)

    # Step 2: Regime-Specific Bias Correction on the raw NWP forecast
    cor_res = regime_corrector.correct(raw_rainfall, regime, features)
    corrected_val = max(0.0, float(cor_res["corrected_rainfall"]))
    delta_val = round(corrected_val - raw_rainfall, 2)

    # Step 3: Heavy Rainfall Risk Estimation
    risk_res = heavy_rain_model.estimate_probability(
        corrected_rainfall=corrected_val,
        features=features,
        regime=regime,
        threshold=threshold
    )

    forecast_time_formatted = _format_ist_timestamp(selected_slot_time)

    # Available hourly forecast slots for selector
    available_slots = []
    for s in upcoming_slots[:24]:
        if s.rainfall is not None and not math.isnan(s.rainfall):
            available_slots.append(
                HourlyForecastSlot(
                    timestamp=s.timestamp,
                    formatted_time=_format_ist_timestamp(s.timestamp),
                    rainfall_mm=round(float(s.rainfall), 2),
                    temperature_c=round(float(s.temperature), 1) if s.temperature is not None else None,
                    weather_description=s.weather_description
                )
            )

    # Log into database
    loc = LocationService.get_district_by_name(db, resolved_district or "New Delhi", resolved_state)
    if loc:
        try:
            pred_record = CorrectionPrediction(
                location_id=loc.id,
                timestamp=datetime.now(timezone.utc),
                raw_rainfall=raw_rainfall,
                corrected_rainfall=corrected_val,
                regime_used=regime,
                heavy_rain_prob=risk_res["probability"],
                threshold_used=threshold,
                risk_level=risk_res["risk_level"],
                model_version=regime_corrector.version
            )
            db.add(pred_record)
            db.commit()
        except Exception:
            db.rollback()

    return CorrectionResponse(
        raw_rainfall_mm=raw_rainfall,
        corrected_rainfall_mm=corrected_val,
        delta_mm=delta_val,
        regime_used=regime,
        status=cor_res["status"],
        model_version=regime_corrector.version,
        explanation=cor_res["explanation"],
        heavy_rain_probability=risk_res["probability"],
        heavy_rain_risk_level=risk_res["risk_level"],
        badge_color=risk_res["badge_color"],
        threshold_mm=threshold,
        forecast_time=selected_slot_time,
        forecast_time_formatted=forecast_time_formatted,
        available_forecasts=available_slots
    )
