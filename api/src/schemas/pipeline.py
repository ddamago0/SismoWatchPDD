from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class PipelineRun(BaseModel):
    id: int
    dag_id: str
    run_id: str
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    records_ingested: int = 0
    records_curated: int = 0
    records_quarantined: int = 0
    error_details: Optional[str] = None
    updated_at: datetime


class QuarantineRecord(BaseModel):
    quarantine_id: int
    event_id: Optional[str] = None
    raw_payload: Optional[Dict[str, Any]] = None
    rejection_reason: str
    rule_failed: str
    batch_id: Optional[str] = None
    failed_at: datetime


class PipelineStatusResponse(BaseModel):
    dags: List[PipelineRun]
    quality_summary: Dict[str, Any]
    quality_detail: Optional[List[Dict[str, Any]]] = None
    freshness_lag_seconds: int
