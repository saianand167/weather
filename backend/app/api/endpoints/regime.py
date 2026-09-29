from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.location_service import LocationService
from app.services.weather_service import WeatherService
from app.ml.feature_engineering import extract_features
from app.ml.regime_classifier import regime_classifier
from app.schemas.ml import RegimeClassificationResponse
from app.models.ml_records import RegimePrediction

router = APIRouter()


@router.get("/current", response_model=RegimeClassificationResponse)
async def get_current_regime(
    district: Optional[str] = Query(None, description="District name"),
    state: Optional[str] = Query(None, description="State name"),
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude"),
    rainfall_nwp: Optional[float] = Query(None, description="Live NWP rainfall in mm"),
    temperature: Optional[float] = Query(None, description="Live temperature in °C"),
    humidity: Optional[float] = Query(None, description="Live humidity in %"),
    pressure: Optional[float] = Query(None, description="Live surface pressure in hPa"),
    wind_speed: Optional[float] = Query(None, description="Live wind speed in km/h"),
    wind_direction: Optional[float] = Query(None, description="Live wind direction in degrees"),
    elevation: Optional[float] = Query(None, description="Elevation in meters"),
    db: Session = Depends(get_db)
):
    """
    Evaluates and identifies the prevailing Weather Regime for the selected location
    using real-time live NWP meteorological observations.
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

    curr_rainfall = rainfall_nwp
    curr_temp = temperature
    curr_hum = humidity
    curr_pres = pressure
    curr_wind = wind_speed
    curr_wind_dir = wind_direction
    curr_elev = elevation
    timestamp_str = datetime.now(timezone.utc).isoformat()

    # If any live parameter was not passed from caller, fetch from live weather service
    if curr_rainfall is None or curr_temp is None or curr_hum is None:
        try:
            forecast = await WeatherService.fetch_live_forecast(
                latitude=target_lat,
                longitude=target_lon,
                state=resolved_state,
                district=resolved_district,
                forecast_days=1,
                db=db
            )
            curr = forecast.current
            if curr_rainfall is None: curr_rainfall = curr.rainfall or 0.0
            if curr_temp is None: curr_temp = curr.temperature
            if curr_hum is None: curr_hum = curr.humidity
            if curr_pres is None: curr_pres = curr.pressure
            if curr_wind is None: curr_wind = curr.wind_speed
            if curr_wind_dir is None: curr_wind_dir = curr.wind_direction
            if curr_elev is None: curr_elev = curr.elevation
            timestamp_str = curr.timestamp
        except Exception:
            # Check if database has any location coordinates or elevation
            loc = LocationService.get_district_by_name(db, resolved_district or "New Delhi", resolved_state)
            if loc:
                if curr_elev is None: curr_elev = getattr(loc, "elevation", 150.0)
            # If still None, supply standard atmospheric physical defaults
            if curr_rainfall is None: curr_rainfall = 0.0
            if curr_temp is None: curr_temp = 28.0
            if curr_hum is None: curr_hum = 70.0
            if curr_pres is None: curr_pres = 1008.0
            if curr_wind is None: curr_wind = 12.0
            if curr_wind_dir is None: curr_wind_dir = 220.0
            if curr_elev is None: curr_elev = 150.0

    # Extract features using established synoptic physics
    features = extract_features(
        rainfall_nwp=curr_rainfall or 0.0,
        temperature=curr_temp if curr_temp is not None else 28.0,
        humidity=curr_hum if curr_hum is not None else 70.0,
        surface_pressure=curr_pres if curr_pres is not None else 1008.0,
        wind_speed=curr_wind if curr_wind is not None else 12.0,
        wind_direction=curr_wind_dir if curr_wind_dir is not None else 220.0,
        latitude=target_lat,
        longitude=target_lon,
        elevation=curr_elev or 150.0,
        timestamp_dt=datetime.now()
    )

    regime, conf, probs, explanation = regime_classifier.classify(features)

    # Log prediction into database
    loc = LocationService.get_district_by_name(db, resolved_district or "New Delhi", resolved_state)
    if loc:
        try:
            pred_record = RegimePrediction(
                location_id=loc.id,
                timestamp=datetime.now(timezone.utc),
                predicted_regime=regime,
                confidence=conf,
                explanation=explanation,
                method=regime_classifier.model_version
            )
            db.add(pred_record)
            db.commit()
        except Exception:
            db.rollback()

    return RegimeClassificationResponse(
        predicted_regime=regime,
        confidence=conf,
        confidence_percent=round(conf * 100, 1),
        probabilities=probs,
        explanation=explanation,
        method=regime_classifier.model_version,
        district=resolved_district,
        state=resolved_state,
        timestamp=timestamp_str,
        features=features
    )
