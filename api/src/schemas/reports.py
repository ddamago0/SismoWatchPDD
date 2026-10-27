from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class AIReport(BaseModel):
    id: int
    report_date: date
    title: str
    summary_narrative: str
    top_regions: List[Dict[str, Any]]
    max_magnitude_event: Dict[str, Any]
    total_events_24h: int
    avg_magnitude: float
    tsunami_alerts_count: int
    anomalies_detected: List[Dict[str, Any]]
    provider_used: str
    validation_passed: bool
    created_at: datetime
