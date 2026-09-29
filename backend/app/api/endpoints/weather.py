from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.location_service import LocationService
from app.services.weather_service import WeatherService
from app.schemas.weather import NormalizedCurrentWeather, ForecastResponse

router = APIRouter()


@router.get("/current", response_model=NormalizedCurrentWeather)
async def get_current_weather(
    lat: Optional[float] = Query(None, description="Latitude coordinate"),
    lon: Optional[float] = Query(None, description="Longitude coordinate"),
    district: Optional[str] = Query(None, description="District name"),
    state: Optional[str] = Query(None, description="State name"),
    db: Session = Depends(get_db)
):
    """
    Fetch current live meteorological conditions from the real NWP data source.
    Accepts latitude/longitude coordinates or district name.
    """
    target_lat = lat
    target_lon = lon
    resolved_district = district
    resolved_state = state

    # Resolve coordinates from district if coordinates are not explicitly passed
    if (target_lat is None or target_lon is None) and district:
        loc = LocationService.get_district_by_name(db, district, state)
        if not loc:
            raise HTTPException(
                status_code=404,
                detail=f"District '{district}' not found in the administrative registry. Please check the location."
            )
        target_lat = loc.latitude
        target_lon = loc.longitude
        resolved_district = loc.district
        resolved_state = loc.state

    # Fallback default: New Delhi (28.6139, 77.2090) if nothing specified
    if target_lat is None or target_lon is None:
        target_lat = 28.6139
        target_lon = 77.2090
        resolved_district = "New Delhi"
        resolved_state = "Delhi"

    try:
        forecast = await WeatherService.fetch_live_forecast(
            latitude=target_lat,
            longitude=target_lon,
            state=resolved_state,
            district=resolved_district,
            forecast_days=1,
            db=db
        )
        return forecast.current
    except ConnectionError as ce:
        raise HTTPException(
            status_code=503,
            detail="Live data currently unavailable. Please check the configured data source."
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail="Live data currently unavailable. Please check the configured data source."
        )


@router.get("/forecast", response_model=ForecastResponse)
async def get_weather_forecast(
    lat: Optional[float] = Query(None, description="Latitude coordinate"),
    lon: Optional[float] = Query(None, description="Longitude coordinate"),
    district: Optional[str] = Query(None, description="District name"),
    state: Optional[str] = Query(None, description="State name"),
    days: int = Query(3, ge=1, le=7, description="Forecast horizon in days"),
    db: Session = Depends(get_db)
):
    """
    Fetch live multi-day hourly NWP rainfall and meteorological forecasts from the real data source.
    """
    target_lat = lat
    target_lon = lon
    resolved_district = district
    resolved_state = state

    if (target_lat is None or target_lon is None) and district:
        loc = LocationService.get_district_by_name(db, district, state)
        if not loc:
            raise HTTPException(
                status_code=404,
                detail=f"District '{district}' not found in the administrative registry."
            )
        target_lat = loc.latitude
        target_lon = loc.longitude
        resolved_district = loc.district
        resolved_state = loc.state

    if target_lat is None or target_lon is None:
        target_lat = 28.6139
        target_lon = 77.2090
        resolved_district = "New Delhi"
        resolved_state = "Delhi"

    try:
        return await WeatherService.fetch_live_forecast(
            latitude=target_lat,
            longitude=target_lon,
            state=resolved_state,
            district=resolved_district,
            forecast_days=days,
            db=db
        )
    except ConnectionError as ce:
        raise HTTPException(
            status_code=503,
            detail="Live data currently unavailable. Please check the configured data source."
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail="Live data currently unavailable. Please check the configured data source."
        )
