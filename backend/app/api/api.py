from fastapi import APIRouter
from app.api.endpoints import (
    health, weather, location, data_sources,
    regime, correction, verification, events, error_analysis,
    assistant
)

api_router = APIRouter()

# Part 1: Foundation
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather & Forecast"])
api_router.include_router(location.router, prefix="/location", tags=["Administrative Geography"])
api_router.include_router(data_sources.router, prefix="/data-sources", tags=["Data Sources"])

# Part 2: AI/ML Post-Processing Layer
api_router.include_router(regime.router, prefix="/ml/regime", tags=["ML: Regime Classification"])
api_router.include_router(correction.router, prefix="/ml/correction", tags=["ML: Bias Correction"])
api_router.include_router(verification.router, prefix="/ml/verification", tags=["ML: Verification Scorecard"])
api_router.include_router(events.router, prefix="/ml/events", tags=["ML: Historical Events"])
api_router.include_router(error_analysis.router, prefix="/ml/error-analysis", tags=["ML: Error Analysis"])

# Part 3: AI Assistant & Decision Support
api_router.include_router(assistant.router, prefix="/assistant", tags=["Part 3: AI Assistant"])

