from typing import List, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text content")


class ChatRequest(BaseModel):
    message: str = Field(..., description="User's query")
    district: Optional[str] = Field(None, description="Currently selected district")
    state: Optional[str] = Field(None, description="Currently selected state")
    lat: Optional[float] = Field(None, description="Latitude of selected location")
    lon: Optional[float] = Field(None, description="Longitude of selected location")
    rainfall: Optional[float] = Field(None, description="Current live precipitation in mm")
    temperature: Optional[float] = Field(None, description="Current live temperature in °C")
    humidity: Optional[float] = Field(None, description="Current live relative humidity in %")
    pressure: Optional[float] = Field(None, description="Current live surface pressure in hPa")
    wind_speed: Optional[float] = Field(None, description="Current live wind speed in km/h")
    wind_direction: Optional[float] = Field(None, description="Current live wind direction in degrees")
    weather_description: Optional[str] = Field(None, description="Current weather condition text")
    history: Optional[List[ChatMessage]] = Field(default=[], description="Recent conversation turns")


class ChatResponse(BaseModel):
    reply: str
    district: str
    state: str
    regime: str
    status: str
    timestamp: str


class AssistantStatusResponse(BaseModel):
    configured: bool
    provider: str
    model: str
    status: str
    message: str
