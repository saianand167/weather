import math
from typing import Dict, Any, Optional
from datetime import datetime


def compute_coastal_distance_km(latitude: float, longitude: float) -> float:
    """
    Approximates minimum distance to the Indian coastline (Arabian Sea / Bay of Bengal / Indian Ocean).
    Standard geographical reference polygon for Indian peninsula coast.
    """
    # Key anchor points along Indian western and eastern coastlines
    coast_anchors = [
        (22.8, 69.5),  # Kutch, Gujarat
        (21.0, 72.8),  # Surat
        (19.0, 72.8),  # Mumbai
        (15.4, 73.8),  # Goa
        (12.9, 74.8),  # Mangaluru
        (8.5, 76.9),   # Thiruvananthapuram
        (8.1, 77.5),   # Kanyakumari
        (9.9, 78.1),   # Madurai / Gulf of Mannar
        (13.1, 80.3),  # Chennai
        (17.7, 83.3),  # Visakhapatnam
        (19.8, 85.8),  # Puri / Chilika
        (21.6, 87.5),  # Digha, West Bengal
        (22.5, 88.3),  # Kolkata / Sundarbans
    ]

    min_dist = float('inf')
    for clat, clon in coast_anchors:
        # Haversine distance in km
        dlat = math.radians(latitude - clat)
        dlon = math.radians(longitude - clon)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(clat)) * math.cos(math.radians(latitude)) *
             math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        dist = 6371.0 * c
        if dist < min_dist:
            min_dist = dist

    return round(min_dist, 1)


def is_orographic_zone(latitude: float, longitude: float, elevation: Optional[float] = None) -> bool:
    """
    Determines if coordinates lie in high-relief orographic regions
    (Western Ghats or Himalayan foothills / Northeast Hills).
    """
    # Western Ghats corridor: Lat 8.0 - 21.0, Lon 73.0 - 76.0
    is_western_ghats = (8.0 <= latitude <= 21.0 and 73.0 <= longitude <= 76.0)

    # Himalayan & NE Hill tracts: Lat 26.0 - 36.0, Lon 74.0 - 95.0, or elevated
    is_himalayan_or_ne = (
        (27.0 <= latitude <= 36.0 and 74.0 <= longitude <= 81.0) or  # NW Himalayas
        (24.0 <= latitude <= 29.0 and 88.0 <= longitude <= 96.0)     # Eastern Himalayas / Meghalaya
    )

    if elevation and elevation > 450.0:
        return True
    return is_western_ghats or is_himalayan_or_ne


def extract_features(
    rainfall_nwp: float,
    temperature: float,
    humidity: float,
    surface_pressure: float,
    wind_speed: float,
    wind_direction: float,
    latitude: float,
    longitude: float,
    elevation: Optional[float] = None,
    timestamp_dt: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Computes normalized, physically grounded meteorological features
    for weather regime classification and bias correction.
    """
    if timestamp_dt is None:
        timestamp_dt = datetime.now()

    month = timestamp_dt.month
    is_monsoon = 1 if 6 <= month <= 9 else 0
    is_winter_wd = 1 if month in (12, 1, 2) else 0

    coastal_dist = compute_coastal_distance_km(latitude, longitude)
    is_coastal = 1 if coastal_dist <= 75.0 else 0
    is_orographic = 1 if is_orographic_zone(latitude, longitude, elevation) else 0

    # Moisture flux proxy (specific humidity / relative saturation * wind speed)
    moisture_flux = round((humidity / 100.0) * wind_speed, 2)

    # Surface pressure anomaly relative to standard sea-level atmosphere (1013.25 hPa)
    pressure_deficit = round(1013.25 - surface_pressure, 2)

    # Wind components (u = eastward, v = northward)
    rad_dir = math.radians(wind_direction if wind_direction is not None else 0.0)
    wind_u = round(-wind_speed * math.sin(rad_dir), 2)
    wind_v = round(-wind_speed * math.cos(rad_dir), 2)

    return {
        "rainfall_nwp_raw": max(0.0, float(rainfall_nwp or 0.0)),
        "temperature": float(temperature or 25.0),
        "humidity": float(humidity or 60.0),
        "surface_pressure": float(surface_pressure or 1005.0),
        "wind_speed": float(wind_speed or 10.0),
        "wind_direction": float(wind_direction or 0.0),
        "wind_u": wind_u,
        "wind_v": wind_v,
        "elevation": float(elevation or 150.0),
        "latitude": latitude,
        "longitude": longitude,
        "month": month,
        "is_monsoon": is_monsoon,
        "is_winter_wd": is_winter_wd,
        "coastal_distance_km": coastal_dist,
        "is_coastal": is_coastal,
        "is_orographic": is_orographic,
        "moisture_flux": moisture_flux,
        "pressure_deficit": pressure_deficit
    }
