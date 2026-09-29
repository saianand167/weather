from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict


class RegimeClassificationResponse(BaseModel):
    predicted_regime: str
    confidence: float
    confidence_percent: float
    probabilities: Dict[str, float]
    explanation: str
    method: str
    district: Optional[str] = None
    state: Optional[str] = None
    timestamp: str
    features: Dict[str, Any]
    model_config = ConfigDict(from_attributes=True)


class HourlyForecastSlot(BaseModel):
    timestamp: str
    formatted_time: str
    rainfall_mm: float
    temperature_c: Optional[float] = None
    weather_description: Optional[str] = None


class CorrectionResponse(BaseModel):
    raw_rainfall_mm: float
    corrected_rainfall_mm: float
    delta_mm: float
    regime_used: str
    status: str
    model_version: str
    explanation: str
    heavy_rain_probability: float
    heavy_rain_risk_level: str
    badge_color: str
    threshold_mm: float
    forecast_time: Optional[str] = None
    forecast_time_formatted: Optional[str] = None
    available_forecasts: Optional[List[HourlyForecastSlot]] = None


class HeavyRainfallProbabilityResponse(BaseModel):
    probability: float
    probability_percent: float
    threshold_mm: float
    risk_level: str
    badge_color: str
    model_version: str
    explanation: str


class ContinuousMetrics(BaseModel):
    rmse: float
    mae: float
    bias: float
    correlation: float


class CategoricalMetrics(BaseModel):
    hits: int
    misses: int
    false_alarms: int
    correct_negatives: int
    pod: float
    far: float
    csi: float
    ets: float
    threshold_mm: float
    fss: Optional[float] = None
    fss_status: str


class ForecastEvaluation(BaseModel):
    continuous: ContinuousMetrics
    categorical: CategoricalMetrics


class RegimePerformanceItem(BaseModel):
    regime: str
    samples: int
    raw_rmse: float
    corrected_rmse: float
    raw_mae: float
    corrected_mae: float
    raw_csi: float
    corrected_csi: float
    raw_pod: float
    corrected_pod: float
    raw_far: float
    corrected_far: float


class VerificationSummaryResponse(BaseModel):
    sample_count: int
    threshold_mm: float
    raw_nwp: Dict[str, Any]
    corrected: Dict[str, Any]
    improvements: Dict[str, float]
    regime_wise: List[RegimePerformanceItem]


class ErrorDistributionBin(BaseModel):
    range_label: str
    count: int


class IntensityErrorPoint(BaseModel):
    intensity_bin: str
    raw_error: float
    corrected_error: float


class ErrorAnalysisResponse(BaseModel):
    mean_error_raw: float
    mean_error_corrected: float
    mae_raw: float
    mae_corrected: float
    rmse_raw: float
    rmse_corrected: float
    error_distribution: List[ErrorDistributionBin]
    intensity_vs_error: List[IntensityErrorPoint]
    samples_analyzed: int


class HistoricalEventSummary(BaseModel):
    id: int
    title: str
    regime: str
    state: str
    district: str
    peak_rainfall_mm: float
    start_date: str
    end_date: str
    source_reference: str
    model_config = ConfigDict(from_attributes=True)


class EventTimelineStep(BaseModel):
    timestamp: str
    observed_rainfall: float
    raw_nwp_rainfall: float
    corrected_rainfall: float
    identified_regime: str
    heavy_rain_prob: float
    forecast_error_raw: float
    forecast_error_corrected: float


class HistoricalEventDetail(BaseModel):
    id: int
    title: str
    description: str
    regime: str
    state: str
    district: str
    latitude: float
    longitude: float
    start_date: str
    end_date: str
    peak_rainfall_mm: float
    source_reference: str
    timeline: List[EventTimelineStep]
    event_metrics: Dict[str, Any]


class ModelComparisonItem(BaseModel):
    model_name: str
    type: str
    rmse: float
    mae: float
    bias: float
    correlation: float
    csi: float
    ets: float
    pod: float
    far: float
    fss: Optional[float] = None
    fss_status: str
    status: str


class FeatureImportanceItem(BaseModel):
    feature_name: str
    display_name: str
    importance_score: float
    importance_percent: float


class ExplainabilityResponse(BaseModel):
    model_name: str
    model_version: str
    feature_importances: List[FeatureImportanceItem]
    methodology: str


class HistoricalDataStatusResponse(BaseModel):
    status: str
    observation_records: int
    nwp_records: int
    matched_pairs: int
    rejected_records: int
    missing_values: int
    historical_events_loaded: int
    date_range: str
    training_split: str
    primary_source: str
