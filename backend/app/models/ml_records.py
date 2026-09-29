from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class RegimePrediction(Base):
    """
    Log of weather regime classifications generated for locations and times.
    """
    __tablename__ = "regime_predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    predicted_regime = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=True)  # 0.0 to 1.0
    features_json = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    method = Column(String(100), default="RegimeClassifier-RF-v1", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    location = relationship("Location")


class CorrectionPrediction(Base):
    """
    Log of post-processed bias corrections comparing Raw NWP vs Corrected.
    """
    __tablename__ = "correction_predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    raw_rainfall = Column(Float, nullable=False)
    corrected_rainfall = Column(Float, nullable=False)
    regime_used = Column(String(100), nullable=False)
    heavy_rain_prob = Column(Float, nullable=True)
    threshold_used = Column(Float, default=15.0, nullable=False) # e.g. 15mm/h or 64.5mm/day
    risk_level = Column(String(50), default="Normal", nullable=False) # Normal, Heavy, Very Heavy
    model_version = Column(String(100), default="RegimeBiasCorrector-v1", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    location = relationship("Location")


class VerificationResult(Base):
    """
    Stored verification evaluation metrics for Raw NWP vs ML Corrected.
    """
    __tablename__ = "verification_results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    regime = Column(String(100), nullable=False, index=True)  # "All", "Active Monsoon", etc.
    forecast_type = Column(String(50), nullable=False)        # "Raw NWP" or "Bias-Corrected"
    sample_count = Column(Integer, nullable=False)
    rmse = Column(Float, nullable=False)
    mae = Column(Float, nullable=False)
    bias = Column(Float, nullable=False)
    correlation = Column(Float, nullable=True)
    csi = Column(Float, nullable=True)
    ets = Column(Float, nullable=True)
    pod = Column(Float, nullable=True)
    far = Column(Float, nullable=True)
    fss = Column(Float, nullable=True)
    fss_status = Column(String(100), default="Available", nullable=False)
    threshold_mm = Column(Float, default=15.0, nullable=False)
    evaluation_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class ModelVersion(Base):
    """
    Registry of trained machine learning model artifacts and metadata.
    """
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    model_name = Column(String(150), nullable=False)
    model_type = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    training_dataset = Column(String(200), nullable=False)
    training_samples = Column(Integer, nullable=False)
    val_samples = Column(Integer, default=0, nullable=False)
    test_samples = Column(Integer, default=0, nullable=False)
    features_list = Column(Text, nullable=False)
    metrics_summary = Column(Text, nullable=True)
    status = Column(String(50), default="Trained", nullable=False)
    trained_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class HistoricalEvent(Base):
    """
    Benchmark historical meteorological events over India for interactive replay.
    """
    __tablename__ = "historical_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    regime = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    peak_rainfall_mm = Column(Float, nullable=False)
    source_reference = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
