from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.ml_records import HistoricalEvent
from app.models.historical_data import HistoricalObservation, HistoricalNWP
from app.models.location import Location
from app.ml.feature_engineering import extract_features
from app.ml.regime_classifier import regime_classifier
from app.ml.bias_correction import regime_corrector
from app.ml.heavy_rainfall import heavy_rain_model
from app.ml.verification import verification_engine
from app.schemas.ml import HistoricalEventSummary, HistoricalEventDetail, EventTimelineStep

router = APIRouter()


@router.get("", response_model=List[HistoricalEventSummary])
def list_historical_events(db: Session = Depends(get_db)):
    """
    Returns catalogue of canonical verified Indian meteorological benchmark events
    available for interactive historical replay.
    """
    events = db.query(HistoricalEvent).order_by(HistoricalEvent.start_date.desc()).all()
    return [
        HistoricalEventSummary(
            id=ev.id,
            title=ev.title,
            regime=ev.regime,
            state=ev.state,
            district=ev.district,
            peak_rainfall_mm=ev.peak_rainfall_mm,
            start_date=ev.start_date.isoformat(),
            end_date=ev.end_date.isoformat(),
            source_reference=ev.source_reference
        )
        for ev in events
    ]


@router.get("/{event_id}", response_model=HistoricalEventDetail)
def get_historical_event_replay(event_id: int, db: Session = Depends(get_db)):
    """
    Returns complete granular time-series replay for a historic weather event:
    Observed rainfall, Raw NWP, Identified regime, Corrected rainfall,
    Heavy rainfall probability, and event verification metrics.
    """
    ev = db.query(HistoricalEvent).filter(HistoricalEvent.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Historical event not found.")

    loc = db.query(Location).filter(
        Location.district == ev.district,
        Location.state == ev.state
    ).first()

    timeline_steps: List[EventTimelineStep] = []
    obs_vals = []
    raw_vals = []
    cor_vals = []

    if loc:
        obs_rows = db.query(HistoricalObservation).filter(
            HistoricalObservation.location_id == loc.id,
            HistoricalObservation.timestamp >= ev.start_date,
            HistoricalObservation.timestamp <= ev.end_date
        ).order_by(HistoricalObservation.timestamp).all()

        nwp_rows = db.query(HistoricalNWP).filter(
            HistoricalNWP.location_id == loc.id,
            HistoricalNWP.timestamp >= ev.start_date,
            HistoricalNWP.timestamp <= ev.end_date
        ).order_by(HistoricalNWP.timestamp).all()

        nwp_dict = {n.timestamp: n for n in nwp_rows}

        for obs in obs_rows:
            nwp = nwp_dict.get(obs.timestamp)
            if not nwp:
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

            reg, _, _, _ = regime_classifier.classify(f)
            cor = regime_corrector.correct(nwp.rainfall_nwp_raw, reg, f)
            risk = heavy_rain_model.estimate_probability(cor["corrected_rainfall"], f, reg, threshold=15.0)

            obs_vals.append(obs.rainfall_observed)
            raw_vals.append(nwp.rainfall_nwp_raw)
            cor_vals.append(cor["corrected_rainfall"])

            timeline_steps.append(
                EventTimelineStep(
                    timestamp=obs.timestamp.isoformat(),
                    observed_rainfall=obs.rainfall_observed,
                    raw_nwp_rainfall=nwp.rainfall_nwp_raw,
                    corrected_rainfall=cor["corrected_rainfall"],
                    identified_regime=reg,
                    heavy_rain_prob=risk["probability"],
                    forecast_error_raw=round(nwp.rainfall_nwp_raw - obs.rainfall_observed, 2),
                    forecast_error_corrected=round(cor["corrected_rainfall"] - obs.rainfall_observed, 2)
                )
            )

    # Event specific verification metrics
    event_metrics = {}
    if len(obs_vals) >= 3:
        event_metrics = verification_engine.evaluate_forecasts(
            observations=obs_vals,
            raw_nwp=raw_vals,
            corrected=cor_vals,
            threshold=15.0
        )

    return HistoricalEventDetail(
        id=ev.id,
        title=ev.title,
        description=ev.description,
        regime=ev.regime,
        state=ev.state,
        district=ev.district,
        latitude=ev.latitude,
        longitude=ev.longitude,
        start_date=ev.start_date.isoformat(),
        end_date=ev.end_date.isoformat(),
        peak_rainfall_mm=ev.peak_rainfall_mm,
        source_reference=ev.source_reference,
        timeline=timeline_steps,
        event_metrics=event_metrics
    )
