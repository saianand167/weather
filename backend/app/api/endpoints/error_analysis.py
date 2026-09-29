from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import numpy as np

from app.database.session import get_db
from app.models.historical_data import HistoricalObservation, HistoricalNWP
from app.models.location import Location
from app.ml.feature_engineering import extract_features
from app.ml.regime_classifier import regime_classifier
from app.ml.bias_correction import regime_corrector
from app.schemas.ml import ErrorAnalysisResponse, ErrorDistributionBin, IntensityErrorPoint

router = APIRouter()


@router.get("/summary", response_model=ErrorAnalysisResponse)
def get_error_analysis(db: Session = Depends(get_db)):
    """
    Computes rigorous error diagnostics: Forecast Error = Forecast - Observation.
    Produces error distributions and intensity-stratified error curves.
    """
    obs_records = db.query(HistoricalObservation).all()
    nwp_records = db.query(HistoricalNWP).all()

    if not obs_records or not nwp_records:
        return ErrorAnalysisResponse(
            mean_error_raw=0.0,
            mean_error_corrected=0.0,
            mae_raw=0.0,
            mae_corrected=0.0,
            rmse_raw=0.0,
            rmse_corrected=0.0,
            error_distribution=[],
            intensity_vs_error=[],
            samples_analyzed=0
        )

    nwp_map = {(r.location_id, r.timestamp): r for r in nwp_records}
    loc_map = {loc.id: loc for loc in db.query(Location).all()}

    obs_vals = []
    raw_vals = []
    cor_vals = []

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
        return ErrorAnalysisResponse(
            mean_error_raw=0.0,
            mean_error_corrected=0.0,
            mae_raw=0.0,
            mae_corrected=0.0,
            rmse_raw=0.0,
            rmse_corrected=0.0,
            error_distribution=[],
            intensity_vs_error=[],
            samples_analyzed=0
        )

    regimes = regime_classifier.classify_batch(features_list)

    obs_vals = []
    raw_vals = []
    cor_vals = []

    for (obs, nwp, f), reg in zip(valid_pairs, regimes):
        cor = regime_corrector.correct(nwp.rainfall_nwp_raw, reg, f)
        obs_vals.append(obs.rainfall_observed)
        raw_vals.append(nwp.rainfall_nwp_raw)
        cor_vals.append(cor["corrected_rainfall"])

    obs_arr = np.array(obs_vals)
    raw_arr = np.array(raw_vals)
    cor_arr = np.array(cor_vals)

    raw_errors = raw_arr - obs_arr
    cor_errors = cor_arr - obs_arr

    # Error distribution bins
    bins = [
        ("<-15 mm", np.sum(cor_errors < -15)),
        ("-15 to -5 mm", np.sum((cor_errors >= -15) & (cor_errors < -5))),
        ("-5 to -1 mm", np.sum((cor_errors >= -5) & (cor_errors < -1))),
        ("-1 to +1 mm (Accurate)", np.sum((cor_errors >= -1) & (cor_errors <= 1))),
        ("+1 to +5 mm", np.sum((cor_errors > 1) & (cor_errors <= 5))),
        ("+5 to +15 mm", np.sum((cor_errors > 5) & (cor_errors <= 15))),
        (">+15 mm", np.sum(cor_errors > 15))
    ]
    dist_bins = [ErrorDistributionBin(range_label=b[0], count=int(b[1])) for b in bins]

    # Intensity Stratification (Rainfall Intensity vs Error)
    intensity_bins_def = [
        ("0 - 2 mm (Trace)", 0.0, 2.0),
        ("2 - 10 mm (Light)", 2.0, 10.0),
        ("10 - 25 mm (Moderate)", 10.0, 25.0),
        ("25 - 50 mm (Heavy)", 25.0, 50.0),
        ("> 50 mm (Very Heavy)", 50.0, 500.0)
    ]

    intensity_points = []
    for label, low, high in intensity_bins_def:
        mask = (obs_arr >= low) & (obs_arr < high)
        if np.sum(mask) > 0:
            avg_raw_err = round(float(np.mean(raw_errors[mask])), 2)
            avg_cor_err = round(float(np.mean(cor_errors[mask])), 2)
        else:
            avg_raw_err = 0.0
            avg_cor_err = 0.0
        intensity_points.append(
            IntensityErrorPoint(
                intensity_bin=label,
                raw_error=avg_raw_err,
                corrected_error=avg_cor_err
            )
        )

    return ErrorAnalysisResponse(
        mean_error_raw=round(float(np.mean(raw_errors)), 2),
        mean_error_corrected=round(float(np.mean(cor_errors)), 2),
        mae_raw=round(float(np.mean(np.abs(raw_errors))), 2),
        mae_corrected=round(float(np.mean(np.abs(cor_errors))), 2),
        rmse_raw=round(float(np.sqrt(np.mean(raw_errors ** 2))), 2),
        rmse_corrected=round(float(np.sqrt(np.mean(cor_errors ** 2))), 2),
        error_distribution=dist_bins,
        intensity_vs_error=intensity_points,
        samples_analyzed=len(obs_arr)
    )
