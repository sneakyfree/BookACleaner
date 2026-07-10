"""
Human-in-the-Loop (HITL) Approval System
Manages approval queues for high-risk actions and verification decisions
Persists all data to the database via ApprovalQueueItem model.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, timezone
from enum import Enum
import logging
import uuid

from app.database import get_db
from app.core.audit import record_audit
from app.api.deps import get_admin_user

router = APIRouter(prefix="/hitl", tags=["HITL Approvals"])
logger = logging.getLogger(__name__)


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class ApprovalType(str, Enum):
    VERIFICATION = "verification"
    PAYOUT = "payout"
    DISPUTE = "dispute"
    ACCOUNT_DELETION = "account_deletion"
    HIGH_VALUE_JOB = "high_value_job"
    BACKGROUND_CHECK = "background_check"


class ApprovalRequestSchema(BaseModel):
    """Schema for creating/returning approval requests"""
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    type: ApprovalType
    entity_id: str
    entity_type: str
    requested_by: Optional[str] = None
    reason: str
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    context: dict = Field(default_factory=dict)
    status: ApprovalStatus = ApprovalStatus.PENDING
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None


class ApprovalDecision(BaseModel):
    """Decision on an approval request"""
    approved: bool
    notes: Optional[str] = None


class ApprovalQueueResponse(BaseModel):
    """Response for approval queue listing"""
    items: List[ApprovalRequestSchema]
    total: int
    pending_count: int
    urgent_count: int


@router.get("/queue", response_model=ApprovalQueueResponse)
async def get_approval_queue(
    status_filter: Optional[ApprovalStatus] = Query(None, alias="status"),
    type_filter: Optional[ApprovalType] = Query(None, alias="type"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    admin=Depends(get_admin_user),
    db=Depends(get_db),
):
    """Get pending approval queue for admin review"""
    # Fetch all items from DB
    items = await db.approval_queue.find_many()
    
    # Apply filters
    if status_filter:
        items = [i for i in items if i.get("status") == status_filter.value]
    if type_filter:
        items = [i for i in items if i.get("type") == type_filter.value]
    if priority_filter:
        items = [i for i in items if i.get("priority") == priority_filter]
    
    # Sort by priority and creation date
    priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
    items.sort(key=lambda x: (priority_order.get(x.get("priority", "medium"), 2), x.get("created_at", "")))
    
    total = len(items)
    pending_items = [i for i in items if i.get("status") == ApprovalStatus.PENDING.value]
    pending_count = len(pending_items)
    urgent_count = len([i for i in pending_items if i.get("priority") == "urgent"])
    
    # Apply pagination
    paginated = items[offset:offset + limit]
    
    return ApprovalQueueResponse(
        items=[ApprovalRequestSchema(**i) for i in paginated],
        total=total,
        pending_count=pending_count,
        urgent_count=urgent_count,
    )


@router.get("/queue/{approval_id}")
async def get_approval_request(approval_id: str, admin=Depends(get_admin_user), db=Depends(get_db)):
    """Get a specific approval request"""
    item = await db.approval_queue.find_unique(where={"id": approval_id})
    if not item:
        raise HTTPException(status_code=404, detail="Approval request not found")
    return item


@router.post("/queue/{approval_id}/decide")
async def decide_approval(
    approval_id: str,
    decision: ApprovalDecision,
    admin=Depends(get_admin_user),
    db=Depends(get_db),
):
    """Approve or reject an approval request"""
    # Reviewer identity comes from the authenticated admin, never a caller-
    # supplied value — previously admin_id was an unauthenticated query param,
    # letting anyone decide approvals and spoof the reviewer.
    admin_id = admin["id"]
    item = await db.approval_queue.find_unique(where={"id": approval_id})
    if not item:
        raise HTTPException(status_code=404, detail="Approval request not found")
    
    if item.get("status") != ApprovalStatus.PENDING.value:
        raise HTTPException(
            status_code=400,
            detail=f"Request already {item.get('status')}"
        )
    
    # Update the request in DB
    new_status = ApprovalStatus.APPROVED.value if decision.approved else ApprovalStatus.REJECTED.value
    await db.approval_queue.update(
        where={"id": approval_id},
        data={
            "status": new_status,
            "reviewed_by": admin_id,
            "reviewed_at": datetime.now(timezone.utc),
            "review_notes": decision.notes,
        }
    )
    
    await record_audit(
        db,
        event_type="approval.approved" if decision.approved else "approval.rejected",
        actor=admin, target=approval_id, details=item.get("type"),
    )
    logger.info(
        f"HITL Decision: {item.get('type')} #{approval_id} "
        f"{'APPROVED' if decision.approved else 'REJECTED'} by {admin_id}"
    )

    # TODO: Trigger post-approval actions (webhooks, notifications, etc.)
    
    return {
        "status": "success",
        "decision": "approved" if decision.approved else "rejected",
        "approval_id": approval_id,
    }


@router.post("/request")
async def create_approval_request(request: ApprovalRequestSchema, admin=Depends(get_admin_user), db=Depends(get_db)):
    """Create a new approval request (internal use)"""
    item = await db.approval_queue.create(data={
        "id": request.id or str(uuid.uuid4()),
        "type": request.type.value,
        "entity_id": request.entity_id,
        "entity_type": request.entity_type,
        "requested_by": request.requested_by,
        "reason": request.reason,
        "priority": request.priority,
        "context": request.context,
        "status": request.status.value,
        "expires_at": request.expires_at,
    })
    
    logger.info(
        f"HITL Request Created: {request.type.value} #{item.get('id')} "
        f"priority={request.priority}"
    )
    
    return item


@router.get("/stats")
async def get_approval_stats(admin=Depends(get_admin_user), db=Depends(get_db)):
    """Get statistics about the approval queue"""
    items = await db.approval_queue.find_many()
    
    pending = [i for i in items if i.get("status") == ApprovalStatus.PENDING.value]
    approved = [i for i in items if i.get("status") == ApprovalStatus.APPROVED.value]
    rejected = [i for i in items if i.get("status") == ApprovalStatus.REJECTED.value]
    
    # Average response time for completed items
    completed = approved + rejected
    avg_response_time = None
    if completed:
        response_times = []
        for i in completed:
            reviewed_at = i.get("reviewed_at")
            created_at = i.get("created_at")
            if reviewed_at and created_at:
                try:
                    r = datetime.fromisoformat(str(reviewed_at)) if isinstance(reviewed_at, str) else reviewed_at
                    c = datetime.fromisoformat(str(created_at)) if isinstance(created_at, str) else created_at
                    response_times.append((r - c).total_seconds())
                except (ValueError, TypeError):
                    pass
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
    
    return {
        "total": len(items),
        "pending": len(pending),
        "approved": len(approved),
        "rejected": len(rejected),
        "by_type": {
            t.value: len([i for i in items if i.get("type") == t.value])
            for t in ApprovalType
        },
        "by_priority": {
            "urgent": len([i for i in pending if i.get("priority") == "urgent"]),
            "high": len([i for i in pending if i.get("priority") == "high"]),
            "medium": len([i for i in pending if i.get("priority") == "medium"]),
            "low": len([i for i in pending if i.get("priority") == "low"]),
        },
        "avg_response_time_seconds": avg_response_time,
    }


# Helper function for other modules to request approval
async def request_approval(
    type: ApprovalType,
    entity_id: str,
    entity_type: str,
    reason: str,
    priority: str = "medium",
    context: dict = None,
    requested_by: str = None,
) -> dict:
    """Helper function to request human approval from other modules"""
    from app.database import db as database
    
    item = await database.approval_queue.create(data={
        "type": type.value,
        "entity_id": entity_id,
        "entity_type": entity_type,
        "reason": reason,
        "priority": priority,
        "context": context or {},
        "requested_by": requested_by,
    })
    
    logger.info(f"Approval requested: {type.value} for {entity_type}:{entity_id}")
    
    return item
