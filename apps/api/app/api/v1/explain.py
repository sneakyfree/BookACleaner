"""
Explainability API Endpoints
Provides multi-layer explanations for decisions
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import date, time

from app.services.explainer import explainer, Explanation
from app.services.contradiction import contradiction_detector, ContradictionResult
from app.services.audit import audit_service, AuditSnapshot

router = APIRouter(prefix="/explain", tags=["Explainability"])


class PriceExplainRequest(BaseModel):
    """Request to explain a price calculation"""
    base_price: float
    property_size: int
    service_type: str
    urgency: str = "normal"
    cleaner_tier: int = 3
    discounts: Optional[List[dict]] = None


class BookingValidationRequest(BaseModel):
    """Request to validate booking for contradictions"""
    property_size: Optional[int] = None
    service_type: str
    estimated_hours: Optional[float] = None
    scheduled_date: date
    scheduled_time: time
    urgency: str = "normal"
    special_requests: Optional[str] = None


@router.post("/price", response_model=Explanation)
async def explain_price(request: PriceExplainRequest):
    """
    Generate multi-layer explanation for price calculation.
    Returns client-friendly summary plus detailed breakdowns.
    """
    return explainer.explain_job_price(
        base_price=request.base_price,
        property_size=request.property_size,
        service_type=request.service_type,
        urgency=request.urgency,
        cleaner_tier=request.cleaner_tier,
        discounts=request.discounts,
    )


@router.post("/booking/validate", response_model=ContradictionResult)
async def validate_booking(request: BookingValidationRequest):
    """
    Detect contradictions in booking request.
    Returns list of warnings/errors that should be resolved.
    """
    return contradiction_detector.detect_booking_contradictions(
        property_size=request.property_size,
        service_type=request.service_type,
        estimated_hours=request.estimated_hours,
        scheduled_date=request.scheduled_date,
        scheduled_time=request.scheduled_time,
        urgency=request.urgency,
        special_requests=request.special_requests,
    )


@router.get("/audit/{snapshot_id}", response_model=AuditSnapshot)
async def get_audit_snapshot(snapshot_id: str):
    """
    Retrieve an audit snapshot by ID.
    Used for compliance and decision reproducibility.
    """
    snapshot = audit_service.get_snapshot(snapshot_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snapshot


@router.get("/audit/{snapshot_id}/verify")
async def verify_audit_snapshot(snapshot_id: str):
    """
    Verify integrity of an audit snapshot.
    Returns whether the snapshot has been tampered with.
    """
    snapshot = audit_service.get_snapshot(snapshot_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    
    is_valid = audit_service.verify_snapshot(snapshot_id)
    
    return {
        "snapshot_id": snapshot_id,
        "is_valid": is_valid,
        "checksum": snapshot.checksum,
        "message": "Snapshot integrity verified" if is_valid else "INTEGRITY VIOLATION DETECTED"
    }


@router.get("/entity/{entity_type}/{entity_id}/snapshots")
async def get_entity_audit_trail(
    entity_type: str,
    entity_id: str,
    limit: int = Query(20, le=100),
):
    """
    Get audit trail for an entity.
    Shows all decision snapshots for compliance review.
    """
    snapshots = audit_service.get_entity_snapshots(entity_type, entity_id)
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "total": len(snapshots),
        "snapshots": snapshots[:limit],
    }
