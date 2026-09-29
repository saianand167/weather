from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.session import Base


class HistoricalObservation(Base):
    """
    Verified historical meteorological ground/reanalysis observation records.
    Source: Open-Meteo ERA5 Reanalysis / Historical Archive.
    """
    __tablename__ = "historical_observations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    rainfall_observed = Column(Float, nullable=False)  # in mm
    temperature = Column(Float, nullable=True)         # in °C
    humidity = Column(Float, nullable=True)            # in %
    surface_pressure = Column(Float, nullable=True)    # in hPa
    wind_speed = Column(Float, nullable=True)          # in km/h
    wind_direction = Column(Float, nullable=True)      # in degrees
    source = Column(String(100), default="ERA5 Reanalysis Archive", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    location = relationship("Location")

    __table_args__ = (
        Index("idx_hist_obs_loc_time", "location_id", "timestamp", unique=True),
    )


class HistoricalNWP(Base):
    """
    Corresponding historical Numerical Weather Prediction (NWP) baseline forecast records.
    Used as the input feature baseline for bias-correction post-processing.
    """
    __tablename__ = "historical_nwp"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    rainfall_nwp_raw = Column(Float, nullable=False)   # raw NWP precipitation in mm
    temperature_nwp = Column(Float, nullable=True)     # in °C
    humidity_nwp = Column(Float, nullable=True)        # in %
    surface_pressure_nwp = Column(Float, nullable=True)# in hPa
    wind_speed_nwp = Column(Float, nullable=True)      # in km/h
    model_name = Column(String(100), default="ECMWF IFS / GFS Baseline", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    location = relationship("Location")

    __table_args__ = (
        Index("idx_hist_nwp_loc_time", "location_id", "timestamp", unique=True),
    )
