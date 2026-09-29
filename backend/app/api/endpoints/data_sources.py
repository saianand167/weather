from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.data_source_service import DataSourceService
from app.schemas.data_source import DataSourceListResponse, DataSourceResponse

router = APIRouter()


@router.get("/status", response_model=DataSourceListResponse)
def get_data_sources_status(db: Session = Depends(get_db)):
    """
    Returns real status and metadata for all configured meteorological and geographic data sources.
    """
    sources = DataSourceService.get_all(db)
    active_count = sum(1 for s in sources if s.status in ("Connected", "Operational", "Loaded"))
    
    return DataSourceListResponse(
        total_sources=len(sources),
        active_sources=active_count,
        sources=sources
    )


@router.post("/check")
async def probe_data_source_health(db: Session = Depends(get_db)):
    """
    Actively probes external data sources to test real-time connectivity and latency.
    """
    result = await DataSourceService.check_open_meteo_health(db)
    return {
        "message": "Data source health probe completed successfully.",
        "result": result
    }
