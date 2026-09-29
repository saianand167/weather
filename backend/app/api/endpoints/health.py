from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database.session import get_db
from app.schemas.health import HealthResponse, ComponentStatus
from app.config.settings import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    """
    Application health check endpoint.
    Verifies API status, SQLite database connectivity, and configured data source status.
    Does not expose sensitive credentials.
    """
    components = {}

    # Check Database connectivity
    try:
        db.execute(text("SELECT 1"))
        components["database"] = ComponentStatus(
            status="operational",
            details="SQLite local database connected and accessible"
        )
    except Exception as e:
        components["database"] = ComponentStatus(
            status="unhealthy",
            details="Database connection error"
        )

    # Check Data Source configuration
    components["nwp_data_source"] = ComponentStatus(
        status="configured",
        details="Open-Meteo NWP ECMWF/GFS global forecast provider"
    )

    overall_status = "healthy"
    for comp in components.values():
        if comp.status == "unhealthy":
            overall_status = "unhealthy"
            break

    return HealthResponse(
        status=overall_status,
        version="1.0.0",
        part="Part 1 — Live Data & Application Foundation",
        sih_code=settings.SIH_PROBLEM_CODE,
        app_name=settings.APP_NAME,
        timestamp=datetime.now(timezone.utc).isoformat(),
        components=components
    )
