from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class ForecastRecord(Base):
    __tablename__ = "forecast_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)  # Forecast valid timestamp
    rainfall = Column(Float, nullable=True)  # Precipitation in mm
    temperature = Column(Float, nullable=True)  # Temperature in °C
    humidity = Column(Float, nullable=True)  # Relative humidity in %
    wind_speed = Column(Float, nullable=True)  # Wind speed in km/h
    wind_direction = Column(Float, nullable=True)  # Wind direction in degrees
    pressure = Column(Float, nullable=True)  # Surface pressure in hPa
    source = Column(String(100), nullable=False)  # NWP Source name
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    location = relationship("Location", back_populates="forecast_records")

    def __repr__(self):
        return f"<ForecastRecord(loc={self.location_id}, time='{self.timestamp}', rain={self.rainfall}mm)>"
