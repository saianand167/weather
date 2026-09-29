from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.database.session import Base


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), unique=True, nullable=False)
    type = Column(String(100), nullable=False)  # e.g., "NWP Forecast API", "Administrative Geospatial Layer"
    status = Column(String(50), nullable=False, default="Connected")  # "Connected", "Operational", "Offline", "Degraded"
    endpoint = Column(String(255), nullable=True)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_status_check = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    details = Column(Text, nullable=True)

    def __repr__(self):
        return f"<DataSource(name='{self.name}', type='{self.type}', status='{self.status}')>"
