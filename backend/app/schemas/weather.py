from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class WeatherUnits(BaseModel):
    rainfall: str = "mm"
    temperature: str = "°C"
    humidity: str = "%"
    wind_speed: str = "km/h"
    wind_direction: str = "°"
    pressure: str = "hPa"


class NormalizedCurrentWeather(BaseModel):
    timestamp: str = Field(..., description="ISO 8601 formatted live observation/forecast timestamp")
    latitude: float
    longitude: float
    elevation: Optional[float] = None
    state: Optional[str] = None
    district: Optional[str] = None
    
    # Meteorology variables (nullable if not provided by source)
    rainfall: Optional[float] = Field(None, description="Precipitation in mm")
    temperature: Optional[float] = Field(None, description="Temperature in °C")
    humidity: Optional[float] = Field(None, description="Relative humidity in %")
    wind_speed: Optional[float] = Field(None, description="Wind speed in km/h")
    wind_direction: Optional[float] = Field(None, description="Wind direction in degrees")
    pressure: Optional[float] = Field(None, description="Surface pressure in hPa")
    weather_code: Optional[int] = Field(None, description="WMO weather interpretation code")
    weather_description: Optional[str] = Field(None, description="Human readable weather description")
    
    source: str = Field(..., description="Authoritative data source / NWP model name")
    is_live: bool = Field(True, description="Indicates live data status")
    units: WeatherUnits = Field(default_factory=WeatherUnits)


class NormalizedHourlyForecast(BaseModel):
    timestamp: str
    rainfall: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[float] = None
    pressure: Optional[float] = None
    weather_code: Optional[int] = None
    weather_description: Optional[str] = None


class NormalizedDailySummary(BaseModel):
    date: str
    total_rainfall: Optional[float] = None
    temp_max: Optional[float] = None
    temp_min: Optional[float] = None
    wind_speed_max: Optional[float] = None
    weather_code: Optional[int] = None


class ForecastResponse(BaseModel):
    latitude: float
    longitude: float
    state: Optional[str] = None
    district: Optional[str] = None
    timezone: str = "Asia/Kolkata"
    elevation: Optional[float] = None
    source: str
    last_updated: str
    units: WeatherUnits = Field(default_factory=WeatherUnits)
    current: NormalizedCurrentWeather
    hourly: List[NormalizedHourlyForecast]
    daily: List[NormalizedDailySummary]
