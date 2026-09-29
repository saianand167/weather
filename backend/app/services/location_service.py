from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.location import Location
from app.database.india_districts_data import INDIA_DISTRICTS_DATA


class LocationService:
    @staticmethod
    def get_states(db: Session) -> List[str]:
        states = db.query(Location.state).distinct().order_by(Location.state).all()
        return [s[0] for s in states]

    @staticmethod
    def get_districts_by_state(db: Session, state: str) -> List[Location]:
        return db.query(Location).filter(Location.state == state).order_by(Location.district).all()

    @staticmethod
    def get_district_by_name(db: Session, district_name: str, state: Optional[str] = None) -> Optional[Location]:
        query = db.query(Location).filter(Location.district.ilike(district_name))
        if state:
            query = query.filter(Location.state.ilike(state))
        res = query.first()
        if not res:
            # Fallback to substring matching (e.g. 'Wayanad' matching 'Wayanad (Kalpetta)')
            query2 = db.query(Location).filter(Location.district.ilike(f"%{district_name}%"))
            if state:
                query2 = query2.filter(Location.state.ilike(state))
            res = query2.first()
        return res

    @staticmethod
    def get_all_locations(db: Session) -> List[Location]:
        return db.query(Location).order_by(Location.state, Location.district).all()

    @staticmethod
    def get_locations_geojson(db: Session) -> Dict[str, Any]:
        """
        Generates standard GeoJSON FeatureCollection of verified district coordinate points
        for Leaflet map rendering.
        """
        locations = db.query(Location).all()
        features = []
        for loc in locations:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [loc.longitude, loc.latitude]
                },
                "properties": {
                    "id": loc.id,
                    "district": loc.district,
                    "state": loc.state,
                    "latitude": loc.latitude,
                    "longitude": loc.longitude
                }
            })
        return {
            "type": "FeatureCollection",
            "features": features
        }
