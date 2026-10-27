from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class EarthquakeEvent(BaseModel):
    id: str
    mag: float
    place: Optional[str] = None
    time: datetime
    updated: Optional[datetime] = None
    tz: Optional[int] = None
    url: Optional[str] = None
    detail: Optional[str] = None
    felt: Optional[int] = None
    cdi: Optional[float] = None
    mmi: Optional[float] = None
    alert: Optional[str] = None
    status: Optional[str] = None
    tsunami: int = 0
    sig: Optional[int] = None
    net: Optional[str] = None
    code: Optional[str] = None
    mag_type: Optional[str] = None
    type: Optional[str] = None
    title: Optional[str] = None
    longitude: float
    latitude: float
    depth_km: float
    is_validated: bool = True
    batch_id: Optional[str] = None
    curated_at: Optional[datetime] = None


class PaginatedEvents(BaseModel):
    total: int
    page: int
    limit: int
    events: List[EarthquakeEvent]


class KPIResponse(BaseModel):
    total_events_24h: int
    max_magnitude: float
    avg_magnitude: float
    tsunami_alerts_count: int
    quality_score: float
    latest_update: Optional[datetime] = None


class TimeseriesPoint(BaseModel):
    timestamp: str
    count: int
    max_mag: float
    avg_mag: float
