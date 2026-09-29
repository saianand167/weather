from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class LocationBase(BaseModel):
    state: str
    district: str
    latitude: float
    longitude: float


class LocationCreate(LocationBase):
    pass


class LocationResponse(LocationBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class DistrictItem(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float


class StateDistrictsResponse(BaseModel):
    state: str
    districts: List[DistrictItem]


class StateListResponse(BaseModel):
    total_states: int
    states: List[str]
