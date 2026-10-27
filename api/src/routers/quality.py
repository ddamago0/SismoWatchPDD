"""
Router de Calidad y Cuarentena.
RESTRICCIÓN DE SEGURIDAD:
Acceso EXCLUSIVO para rol 'admin'.
Los usuarios con rol 'viewer' reciben HTTP 403 Forbidden.
"""

from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.auth.dependencies import require_role
from src.database import get_db
from src.schemas.pipeline import QuarantineRecord

router = APIRouter(prefix="/api/quality", tags=["Calidad"])


@router.get("/quarantine", response_model=List[QuarantineRecord])
def get_quarantined_records(
    limit: int = Query(50, ge=1, le=500),
    current_user: dict = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Retorna los registros rechazados por las reglas bloqueantes de calidad.
    Solo accesible por administradores.
    """
    sql = text("""
        SELECT quarantine_id, event_id, raw_payload, rejection_reason, rule_failed, batch_id, failed_at
        FROM curated.quality_quarantine
        ORDER BY failed_at DESC
        LIMIT :limit;
    """)
    rows = db.execute(sql, {"limit": limit}).fetchall()
    return [
        QuarantineRecord(
            quarantine_id=r[0],
            event_id=r[1],
            raw_payload=r[2] if isinstance(r[2], dict) else None,
            rejection_reason=r[3],
            rule_failed=r[4],
            batch_id=r[5],
            failed_at=r[6]
        )
        for r in rows
    ]
