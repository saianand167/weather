from typing import Dict, Any, Optional
from pydantic import BaseModel


class ComponentStatus(BaseModel):
    status: str  # "healthy", "operational", "degraded", "unavailable"
    details: Optional[str] = None


class HealthResponse(BaseModel):
    status: str  # "healthy", "degraded", "unhealthy"
    version: str = "1.0.0"
    part: str = "Part 1 — Live Data & Application Foundation"
    sih_code: str = "SIH26080"
    app_name: str = "Rainfall Intelligence"
    timestamp: str
    components: Dict[str, ComponentStatus]
