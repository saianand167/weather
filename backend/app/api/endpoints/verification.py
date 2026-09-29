from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import numpy as np

from app.database.session import get_db
from app.models.historical_data import HistoricalObservation, HistoricalNWP
from app.models.location import Location
from app.ml.feature_engineering import extract_features
from app.ml.regime_classifier import regime_classifier
from app.ml.bias_correction import regime_corrector
from app.ml.verification import verification_engine
from app.schemas.ml import VerificationSummaryResponse, RegimePerformanceItem

router = APIRouter()


@router.get("/summary", response_model=VerificationSummaryResponse)
def get_verification_summary(
    threshold: float = Query(15.0, ge=1.0, le=150.0, description="Verification rainfall threshold in mm"),
    db: Session = Depends(get_db)
):
    """
    Returns full scientific verification scorecard:
    - Continuous metrics: RMSE, MAE, Bias, Correlation
    - Event metrics: CSI, ETS, POD, FAR
    - Spatial grid metric: FSS (with availability status)
    Compares Raw NWP baseline vs ML Regime-Aware Corrected Forecast.
    """
    obs_records = db.query(HistoricalObservation).order_by(HistoricalObservation.timestamp).all()
    nwp_records = db.query(HistoricalNWP).order_by(HistoricalNWP.timestamp).all()

    if not obs_records or not nwp_records:
        # Return empty structure if not yet ingested
        return VerificationSummaryResponse(
            sample_count=0,
            threshold_mm=threshold,
            raw_nwp={"rmse": 0, "mae": 0, "bias": 0, "correlation": 0, "fss": None, "fss_status": "Insufficient data"},
            corrected={"rmse": 0, "mae": 0, "bias": 0, "correlation": 0, "fss": None, "fss_status": "Insufficient data"},
            improvements={"rmse_reduction_percent": 0, "mae_reduction_percent": 0, "csi_gain_percent": 0},
            regime_wise=[]
        )

    nwp_map = {(r.location_id, r.timestamp): r for r in nwp_records}
    loc_map = {loc.id: loc for loc in db.query(Location).all()}

    obs_list = []
    raw_list = []
    cor_list = []
    reg_list = []

    valid_pairs = []
    features_list = []

    for obs in obs_records:
        nwp = nwp_map.get((obs.location_id, obs.timestamp))
        if not nwp:
            continue
        loc = loc_map.get(obs.location_id)
        if not loc:
            continue

        f = extract_features(
            rainfall_nwp=nwp.rainfall_nwp_raw,
            temperature=nwp.temperature_nwp or 25.0,
            humidity=nwp.humidity_nwp or 75.0,
            surface_pressure=nwp.surface_pressure_nwp or 1005.0,
            wind_speed=nwp.wind_speed_nwp or 15.0,
            wind_direction=230.0,
            latitude=loc.latitude,
            longitude=loc.longitude,
            elevation=150.0,
            timestamp_dt=obs.timestamp
        )
        valid_pairs.append((obs, nwp, f))
        features_list.append(f)

    if not valid_pairs:
        return VerificationSummaryResponse(
            sample_count=0,
            threshold_mm=threshold,
            raw_nwp={"rmse": 0, "mae": 0, "bias": 0, "correlation": 0, "fss": None, "fss_status": "Insufficient data"},
            corrected={"rmse": 0, "mae": 0, "bias": 0, "correlation": 0, "fss": None, "fss_status": "Insufficient data"},
            improvements={"rmse_reduction_percent": 0, "mae_reduction_percent": 0, "csi_gain_percent": 0},
            regime_wise=[]
        )

    # Batch classify all samples in one vectorized operation
    regimes = regime_classifier.classify_batch(features_list)

    obs_list = []
    raw_list = []
    cor_list = []

    for (obs, nwp, f), reg in zip(valid_pairs, regimes):
        cor = regime_corrector.correct(nwp.rainfall_nwp_raw, reg, f)
        obs_list.append(obs.rainfall_observed)
        raw_list.append(nwp.rainfall_nwp_raw)
        cor_list.append(cor["corrected_rainfall"])

    res = verification_engine.evaluate_forecasts(
        observations=obs_list,
        raw_nwp=raw_list,
        corrected=cor_list,
        regimes=regimes,
        threshold=threshold
    )

    regime_items = [
        RegimePerformanceItem(**item) for item in res.get("regime_wise", [])
    ]

    return VerificationSummaryResponse(
        sample_count=res["sample_count"],
        threshold_mm=threshold,
        raw_nwp=res["raw_nwp"],
        corrected=res["corrected"],
        improvements=res["improvements"],
        regime_wise=regime_items
    )


@router.get("/regime-wise", response_model=List[RegimePerformanceItem])
def get_regime_wise_metrics(
    threshold: float = Query(15.0, ge=1.0, le=150.0),
    db: Session = Depends(get_db)
):
    """
    Returns regime-by-regime performance breakdown comparing Raw NWP vs Corrected.
    """
    summary = get_verification_summary(threshold=threshold, db=db)
    return summary.regime_wise
