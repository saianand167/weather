from datetime import datetime, timezone
from typing import List, Dict, Any
import httpx
from sqlalchemy.orm import Session
from app.models.data_source import DataSource
from app.config.settings import get_settings
from app.services.mosdac_service import MOSDACService

settings = get_settings()


class DataSourceService:
    @staticmethod
    def get_all(db: Session) -> List[DataSource]:
        # Ensure MOSDAC is dynamically synced with credential state
        mosdac = db.query(DataSource).filter(DataSource.name.like("%MOSDAC%")).first()
        if mosdac:
            is_auth = MOSDACService.is_authenticated()
            mosdac.status = "Connected" if is_auth else "Configured"
            if is_auth:
                mosdac.details = f"MOSDAC ISRO Satellite Connector authenticated (User: {settings.MOSDAC_USERNAME[:3]}***). Active: INSAT-3DR & OceanSat-3."
            db.commit()
        return db.query(DataSource).all()

    @staticmethod
    async def check_open_meteo_health(db: Session) -> Dict[str, Any]:
        """
        Pings the live Open-Meteo endpoint with a lightweight probe
        to ascertain real live network status and latency.
        """
        ds = db.query(DataSource).filter(DataSource.name.like("%Open-Meteo%")).first()
        now = datetime.now(timezone.utc)
        
        status = "Offline"
        latency_ms = None
        details = ""

        try:
            start_time = datetime.now()
            headers = {
                "User-Agent": "RainfallIntelligence-Platform/1.0 (SIH26080; contact@sih26080.gov.in)",
                "Accept": "application/json"
            }
            async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
                res = await client.get(
                    f"{settings.OPEN_METEO_BASE_URL}/forecast",
                    params={"latitude": 28.6139, "longitude": 77.2090, "current": "temperature_2m"}
                )
            latency_ms = round((datetime.now() - start_time).total_seconds() * 1000, 2)
            
            if res.status_code == 200:
                status = "Connected"
                details = f"Operational. Probed New Delhi coordinate. Roundtrip latency: {latency_ms} ms."
            else:
                status = "Degraded"
                details = f"HTTP {res.status_code} received from provider. Probe latency: {latency_ms} ms."
        except Exception as e:
            status = "Offline"
            details = f"Connection failed: {str(e)}"

        if ds:
            ds.status = status
            ds.last_status_check = now
            if status == "Connected":
                ds.last_updated = now
            ds.details = details
            db.commit()

        # Also sync MOSDAC status
        mosdac_status = MOSDACService.get_status()
        mosdac = db.query(DataSource).filter(DataSource.name.like("%MOSDAC%")).first()
        if mosdac:
            mosdac.status = mosdac_status["status"]
            mosdac.last_status_check = now
            mosdac.details = mosdac_status["message"]
            db.commit()

        return {
            "name": "Open-Meteo NWP Forecast API",
            "status": status,
            "latency_ms": latency_ms,
            "last_checked": now.isoformat(),
            "details": details,
            "mosdac_satellite": mosdac_status
        }
