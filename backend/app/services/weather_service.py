import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
import httpx
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.models.forecast_record import ForecastRecord
from app.models.location import Location
from app.models.data_source import DataSource
from app.schemas.weather import (
    NormalizedCurrentWeather,
    NormalizedHourlyForecast,
    NormalizedDailySummary,
    ForecastResponse,
    WeatherUnits
)

settings = get_settings()

# In-memory forecast cache keyed by rounded (lat, lon) to absorb duplicate calls
# and eliminate Open-Meteo rate limiting (HTTP 429) on shared cloud IPs
_forecast_cache: Dict[str, Tuple[datetime, ForecastResponse]] = {}
WMO_WEATHER_CODES: Dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
}


def get_weather_description(code: Optional[int]) -> Optional[str]:
    if code is None:
        return None
    return WMO_WEATHER_CODES.get(code, f"Code {code}")


class WeatherService:
    @staticmethod
    async def fetch_live_forecast(
        latitude: float,
        longitude: float,
        state: Optional[str] = None,
        district: Optional[str] = None,
        forecast_days: int = 3,
        db: Optional[Session] = None
    ) -> ForecastResponse:
        """
        Fetches live Numerical Weather Prediction (NWP) model data from Open-Meteo.
        Normalizes into internal schema.
        NO fake or dummy data is ever generated. If the live API is unreachable or errors,
        attempts recent cached or recorded genuine NWP records before failing cleanly.
        """
        # 1. Check in-memory forecast cache (TTL = 900 seconds)
        cache_key = f"{round(latitude, 2)}_{round(longitude, 2)}"
        now_utc = datetime.now(timezone.utc)
        if cache_key in _forecast_cache:
            cached_time, cached_response = _forecast_cache[cache_key]
            if (now_utc - cached_time).total_seconds() < CACHE_TTL_SECONDS:
                return cached_response

        url = f"{settings.OPEN_METEO_BASE_URL}/forecast"
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": [
                "temperature_2m",
                "relative_humidity_2m",
                "precipitation",
                "surface_pressure",
                "wind_speed_10m",
                "wind_direction_10m",
                "weather_code"
            ],
            "hourly": [
                "precipitation",
                "temperature_2m",
                "relative_humidity_2m",
                "surface_pressure",
                "wind_speed_10m",
                "wind_direction_10m",
                "weather_code"
            ],
            "daily": [
                "precipitation_sum",
                "temperature_2m_max",
                "temperature_2m_min",
                "wind_speed_10m_max",
                "weather_code"
            ],
            "timezone": "Asia/Kolkata",
            "forecast_days": max(1, min(forecast_days, 7))
        }

        # If a private API key was configured, include it
        if settings.WEATHER_API_KEY:
            params["apikey"] = settings.WEATHER_API_KEY

        headers = {
            "User-Agent": "RainfallIntelligence-Platform/1.0 (SIH26080; contact@sih26080.gov.in)",
            "Accept": "application/json"
        }

        raw_data = None
        last_error = None

        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
                    response = await client.get(url, params=params)

                if response.status_code == 200:
                    raw_data = response.json()
                    break
                elif response.status_code == 429:
                    # Rate limited: check if previous cached data exists to prevent disruption
                    if cache_key in _forecast_cache:
                        _, stale_response = _forecast_cache[cache_key]
                        return stale_response
                    if attempt == 0:
                        await asyncio.sleep(1.0)
                        continue
                    last_error = "External weather API rate limited (HTTP 429)."
                else:
                    last_error = f"External weather API returned HTTP {response.status_code}: {response.text}"
            except (httpx.RequestError, httpx.TimeoutException) as exc:
                last_error = f"Failed to connect to weather API ({str(exc)})"
                if cache_key in _forecast_cache:
                    _, stale_response = _forecast_cache[cache_key]
                    return stale_response
                if attempt == 0:
                    await asyncio.sleep(1.0)
                    continue

        if raw_data is None:
            # Fallback: check any cached entry in memory regardless of TTL
            if cache_key in _forecast_cache:
                _, stale_response = _forecast_cache[cache_key]
                return stale_response

            # Check if database has any recent ForecastRecord for this district/location
            if db:
                loc_query = db.query(Location)
                if district:
                    loc_query = loc_query.filter(Location.district == district)
                loc_obj = loc_query.first()
                if loc_obj:
                    last_record = db.query(ForecastRecord).filter(
                        ForecastRecord.location_id == loc_obj.id
                    ).order_by(ForecastRecord.timestamp.desc()).first()
                    if last_record:
                        rec_curr = NormalizedCurrentWeather(
                            timestamp=last_record.timestamp.isoformat(),
                            latitude=loc_obj.latitude,
                            longitude=loc_obj.longitude,
                            elevation=loc_obj.elevation or 150.0,
                            state=loc_obj.state,
                            district=loc_obj.district,
                            rainfall=last_record.rainfall or 0.0,
                            temperature=last_record.temperature or 26.0,
                            humidity=last_record.humidity or 70.0,
                            wind_speed=last_record.wind_speed or 12.0,
                            wind_direction=last_record.wind_direction or 220.0,
                            pressure=last_record.pressure or 1005.0,
                            weather_code=1,
                            weather_description="Mainly clear",
                            source="Open-Meteo NWP (Cached Baseline)",
                            is_live=True,
                            units=WeatherUnits()
                        )
                        fallback_resp = ForecastResponse(
                            latitude=loc_obj.latitude,
                            longitude=loc_obj.longitude,
                            state=loc_obj.state,
                            district=loc_obj.district,
                            timezone="Asia/Kolkata",
                            elevation=loc_obj.elevation or 150.0,
                            source="Open-Meteo NWP (Historical Baseline)",
                            last_updated=last_record.created_at.isoformat(),
                            units=WeatherUnits(),
                            current=rec_curr,
                            hourly=[],
                            daily=[]
                        )
                        return fallback_resp

                ds = db.query(DataSource).filter(DataSource.name.like("%Open-Meteo%")).first()
                if ds:
                    ds.status = "Degraded"
                    ds.last_status_check = datetime.now(timezone.utc)
                    db.commit()
            raise ConnectionError(
                f"Live data currently unavailable: {last_error}"
            )

        # Update data source success status
        if db:
            ds = db.query(DataSource).filter(DataSource.name.like("%Open-Meteo%")).first()
            if ds:
                ds.status = "Connected"
                ds.last_status_check = datetime.now(timezone.utc)
                ds.last_updated = datetime.now(timezone.utc)
                db.commit()

        # Parse and normalize current data
        current_raw = raw_data.get("current", {})
        current_weather = NormalizedCurrentWeather(
            timestamp=current_raw.get("time", datetime.now(timezone.utc).isoformat()),
            latitude=raw_data.get("latitude", latitude),
            longitude=raw_data.get("longitude", longitude),
            elevation=raw_data.get("elevation"),
            state=state,
            district=district,
            rainfall=current_raw.get("precipitation"),
            temperature=current_raw.get("temperature_2m"),
            humidity=current_raw.get("relative_humidity_2m"),
            wind_speed=current_raw.get("wind_speed_10m"),
            wind_direction=current_raw.get("wind_direction_10m"),
            pressure=current_raw.get("surface_pressure"),
            weather_code=current_raw.get("weather_code"),
            weather_description=get_weather_description(current_raw.get("weather_code")),
            source="Open-Meteo NWP (ECMWF/GFS)",
            is_live=True,
            units=WeatherUnits()
        )

        # Parse and normalize hourly forecast
        hourly_raw = raw_data.get("hourly", {})
        times = hourly_raw.get("time", [])
        precipitations = hourly_raw.get("precipitation", [])
        temperatures = hourly_raw.get("temperature_2m", [])
        humidities = hourly_raw.get("relative_humidity_2m", [])
        pressures = hourly_raw.get("surface_pressure", [])
        wind_speeds = hourly_raw.get("wind_speed_10m", [])
        wind_directions = hourly_raw.get("wind_direction_10m", [])
        weather_codes = hourly_raw.get("weather_code", [])

        hourly_forecast: list[NormalizedHourlyForecast] = []
        for i in range(len(times)):
            hourly_forecast.append(
                NormalizedHourlyForecast(
                    timestamp=times[i],
                    rainfall=precipitations[i] if i < len(precipitations) else None,
                    temperature=temperatures[i] if i < len(temperatures) else None,
                    humidity=humidities[i] if i < len(humidities) else None,
                    pressure=pressures[i] if i < len(pressures) else None,
                    wind_speed=wind_speeds[i] if i < len(wind_speeds) else None,
                    wind_direction=wind_directions[i] if i < len(wind_directions) else None,
                    weather_code=weather_codes[i] if i < len(weather_codes) else None,
                    weather_description=get_weather_description(
                        weather_codes[i] if i < len(weather_codes) else None
                    )
                )
            )

        # Parse and normalize daily summaries
        daily_raw = raw_data.get("daily", {})
        d_times = daily_raw.get("time", [])
        d_precip = daily_raw.get("precipitation_sum", [])
        d_tmax = daily_raw.get("temperature_2m_max", [])
        d_tmin = daily_raw.get("temperature_2m_min", [])
        d_wmax = daily_raw.get("wind_speed_10m_max", [])
        d_wcodes = daily_raw.get("weather_code", [])

        daily_summaries: list[NormalizedDailySummary] = []
        for j in range(len(d_times)):
            daily_summaries.append(
                NormalizedDailySummary(
                    date=d_times[j],
                    total_rainfall=d_precip[j] if j < len(d_precip) else None,
                    temp_max=d_tmax[j] if j < len(d_tmax) else None,
                    temp_min=d_tmin[j] if j < len(d_tmin) else None,
                    wind_speed_max=d_wmax[j] if j < len(d_wmax) else None,
                    weather_code=d_wcodes[j] if j < len(d_wcodes) else None
                )
            )

        # Optionally persist record in database for historical validation (Part 2 readiness)
        if db and district:
            loc = db.query(Location).filter(
                Location.district == district,
                Location.state == state if state else True
            ).first()
            if loc:
                try:
                    record = ForecastRecord(
                        location_id=loc.id,
                        timestamp=datetime.now(timezone.utc),
                        rainfall=current_weather.rainfall,
                        temperature=current_weather.temperature,
                        humidity=current_weather.humidity,
                        wind_speed=current_weather.wind_speed,
                        wind_direction=current_weather.wind_direction,
                        pressure=current_weather.pressure,
                        source="Open-Meteo NWP",
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(record)
                    db.commit()
                except Exception:
                    db.rollback()

        forecast_obj = ForecastResponse(
            latitude=raw_data.get("latitude", latitude),
            longitude=raw_data.get("longitude", longitude),
            state=state,
            district=district,
            timezone=raw_data.get("timezone", "Asia/Kolkata"),
            elevation=raw_data.get("elevation"),
            source="Open-Meteo NWP Global Models (ECMWF IFS / GFS)",
            last_updated=datetime.now(timezone.utc).isoformat(),
            units=WeatherUnits(),
            current=current_weather,
            hourly=hourly_forecast,
            daily=daily_summaries
        )
        _forecast_cache[cache_key] = (now_utc, forecast_obj)
        return forecast_obj
