"""
Human-in-the-Loop (HITL) Approval System
Manages approval queues for high-risk actions and verification decisions
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum
import logging
import uuid

from app.database import get_db

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


class ApprovalRequest(BaseModel):
    """Request for human approval"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: ApprovalType
    entity_id: str
    entity_type: str
    requested_by: Optional[str] = None
    reason: str
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    context: dict = Field(default_factory=dict)
    status: ApprovalStatus = ApprovalStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
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
    items: List[ApprovalRequest]
    total: int
    pending_count: int
    urgent_count: int


# In-memory storage for demo (replace with DB in production)
_approval_queue: dict[str, ApprovalRequest] = {}


@router.get("/queue", response_model=ApprovalQueueResponse)
async def get_approval_queue(
    status_filter: Optional[ApprovalStatus] = Query(None, alias="status"),
    type_filter: Optional[ApprovalType] = Query(None, alias="type"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
):
    """Get pending approval queue for admin review"""
    items = list(_approval_queue.values())
    
    # Apply filters
    if status_filter:
        items = [i for i in items if i.status == status_filter]
    if type_filter:
        items = [i for i in items if i.type == type_filter]
    if priority_filter:
        items = [i for i in items if i.priority == priority_filter]
    
    # Sort by priority and creation date
    priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
    items.sort(key=lambda x: (priority_order.get(x.priority, 2), x.created_at))
    
    total = len(items)
    pending_count = len([i for i in items if i.status == ApprovalStatus.PENDING])
    urgent_count = len([i for i in items if i.priority == "urgent" and i.status == ApprovalStatus.PENDING])
    
    return ApprovalQueueResponse(
        items=items[offset:offset + limit],
        total=total,
        pending_count=pending_count,
        urgent_count=urgent_count,
    )


@router.get("/queue/{approval_id}", response_model=ApprovalRequest)
async def get_approval_request(approval_id: str):
    """Get a specific approval request"""
    if approval_id not in _approval_queue:
        raise HTTPException(status_code=404, detail="Approval request not found")
    return _approval_queue[approval_id]


@router.post("/queue/{approval_id}/decide")
async def decide_approval(
    approval_id: str,
    decision: ApprovalDecision,
    admin_id: str = Query(..., description="ID of the admin making the decision"),
):
    """Approve or reject an approval request"""
    if approval_id not in _approval_queue:
        raise HTTPException(status_code=404, detail="Approval request not found")
    
    request = _approval_queue[approval_id]
    
    if request.status != ApprovalStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Request already {request.status.value}"
        )
    
    # Update the request
    request.status = ApprovalStatus.APPROVED if decision.approved else ApprovalStatus.REJECTED
    request.reviewed_by = admin_id
    request.reviewed_at = datetime.utcnow()
    request.review_notes = decision.notes
    
    logger.info(
        f"HITL Decision: {request.type.value} #{approval_id} "
        f"{'APPROVED' if decision.approved else 'REJECTED'} by {admin_id}"
    )
    
    # TODO: Trigger post-approval actions (webhooks, notifications, etc.)
    
    return {
        "status": "success",
        "decision": "approved" if decision.approved else "rejected",
        "approval_id": approval_id,
    }


@router.post("/request", response_model=ApprovalRequest)
async def create_approval_request(request: ApprovalRequest):
    """Create a new approval request (internal use)"""
    _approval_queue[request.id] = request
    
    logger.info(
        f"HITL Request Created: {request.type.value} #{request.id} "
        f"priority={request.priority}"
    )
    
    return request


@router.get("/stats")
async def get_approval_stats():
    """Get statistics about the approval queue"""
    items = list(_approval_queue.values())
    
    pending = [i for i in items if i.status == ApprovalStatus.PENDING]
    approved = [i for i in items if i.status == ApprovalStatus.APPROVED]
    rejected = [i for i in items if i.status == ApprovalStatus.REJECTED]
    
    # Average response time for completed items
    completed = approved + rejected
    avg_response_time = None
    if completed:
        response_times = [
            (i.reviewed_at - i.created_at).total_seconds()
            for i in completed
            if i.reviewed_at
        ]
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
    
    return {
        "total": len(items),
        "pending": len(pending),
        "approved": len(approved),
        "rejected": len(rejected),
        "by_type": {
            t.value: len([i for i in items if i.type == t])
            for t in ApprovalType
        },
        "by_priority": {
            "urgent": len([i for i in pending if i.priority == "urgent"]),
            "high": len([i for i in pending if i.priority == "high"]),
            "medium": len([i for i in pending if i.priority == "medium"]),
            "low": len([i for i in pending if i.priority == "low"]),
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
) -> ApprovalRequest:
    """Helper function to request human approval from other modules"""
    request = ApprovalRequest(
        type=type,
        entity_id=entity_id,
        entity_type=entity_type,
        reason=reason,
        priority=priority,
        context=context or {},
        requested_by=requested_by,
    )
    _approval_queue[request.id] = request
    
    logger.info(f"Approval requested: {type.value} for {entity_type}:{entity_id}")
    
    return request
