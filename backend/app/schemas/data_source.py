from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class DataSourceResponse(BaseModel):
    id: int
    name: str
    type: str
    status: str
    endpoint: Optional[str] = None
    last_updated: datetime
    last_status_check: datetime
    details: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class DataSourceListResponse(BaseModel):
    total_sources: int
    active_sources: int
    sources: List[DataSourceResponse]
