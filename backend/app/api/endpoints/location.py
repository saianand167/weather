from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.location_service import LocationService
from app.schemas.location import LocationResponse, StateListResponse, StateDistrictsResponse, DistrictItem

router = APIRouter()


@router.get("/states", response_model=StateListResponse)
def get_all_states(db: Session = Depends(get_db)):
    """
    Returns all Indian States and Union Territories registered in the database.
    """
    states = LocationService.get_states(db)
    return StateListResponse(total_states=len(states), states=states)


@router.get("/districts", response_model=List[DistrictItem])
def get_districts(
    state: Optional[str] = Query(None, description="Filter districts by state name"),
    db: Session = Depends(get_db)
):
    """
    Returns registered administrative districts, optionally filtered by state.
    """
    if state:
        districts = LocationService.get_districts_by_state(db, state)
    else:
        districts = LocationService.get_all_locations(db)
        
    return [
        DistrictItem(
            id=d.id,
            name=d.district,
            latitude=d.latitude,
            longitude=d.longitude
        )
        for d in districts
    ]


@router.get("/all", response_model=List[LocationResponse])
def get_all_locations(db: Session = Depends(get_db)):
    """
    Returns all location records in the system.
    """
    return LocationService.get_all_locations(db)


@router.get("/geojson")
def get_locations_geojson(db: Session = Depends(get_db)):
    """
    Returns standard GeoJSON FeatureCollection of all Indian district coordinates
    for direct Leaflet interactive map rendering.
    """
    return LocationService.get_locations_geojson(db)


@router.get("/{district}", response_model=LocationResponse)
def get_district_by_name(
    district: str,
    state: Optional[str] = Query(None, description="Optional state disambiguation"),
    db: Session = Depends(get_db)
):
    """
    Returns geographic details for a specific district.
    """
    loc = LocationService.get_district_by_name(db, district, state)
    if not loc:
        raise HTTPException(
            status_code=404,
            detail=f"District '{district}' not found in the administrative registry."
        )
    return loc
