"""
Disputes API for BookACleaner.ai
Handles dispute creation, resolution, and management.
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import logging

from app.database import get_db
from app.core.audit import record_audit
from app.config import get_settings
from app.api.deps import get_current_user

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


# ==================== SCHEMAS ====================

class CreateDisputeRequest(BaseModel):
    job_id: str
    reason: str


class ResolveDisputeRequest(BaseModel):
    resolution_notes: str
    action: str  # refund_client, pay_cleaner, split, dismiss


# ==================== AUTH HELPERS ====================
async def get_admin_user(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ==================== ENDPOINTS ====================

@router.post("/")
async def create_dispute(
    data: CreateDisputeRequest,
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Raise a dispute for a job."""
    job = await db.job.find_unique(where={"id": data.job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Only a party to the job (its client or assigned cleaner) — or an admin —
    # may open a dispute. Otherwise any user could flip an arbitrary job to
    # "disputed" and block its payment/flow (griefing).
    if user.get("role") != "admin":
        client = await db.client.find_first(where={"user_id": user["id"]})
        cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
        is_client = bool(client) and client["id"] == job.get("client_id")
        is_cleaner = bool(cleaner) and cleaner["id"] == job.get("cleaner_id")
        if not (is_client or is_cleaner):
            raise HTTPException(status_code=403, detail="Only a party to the job can raise a dispute")

    # Create dispute using the Dispute model via TableAccessor
    dispute = await db.dispute.create(data={
        "job_id": data.job_id,
        "raised_by": user["id"],
        "reason": data.reason,
        "status": "open",
    })

    # Update job status to disputed
    await db.job.update(where={"id": data.job_id}, data={"status": "disputed"})

    logger.info(f"Dispute {dispute['id']} raised for job {data.job_id} by user {user['id']}")
    return {"id": dispute["id"], "status": "open", "message": "Dispute created successfully"}


@router.get("/")
async def list_disputes(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """List all disputes (admin only)."""
    where = {}
    if status:
        where["status"] = status

    disputes = await db.dispute.find_many(where=where if where else None)
    disputes.sort(key=lambda x: x.get("created_at") or "", reverse=True)

    start = (page - 1) * limit
    end = start + limit
    page_items = disputes[start:end]

    # Enrich with job title and the raising user's name for the admin UI.
    enriched = []
    for d in page_items:
        job = await db.job.find_unique(where={"id": d["job_id"]}) if d.get("job_id") else None
        raiser = await db.user.find_unique(where={"id": d["raised_by"]}) if d.get("raised_by") else None
        enriched.append({
            **d,
            "job_title": job.get("title") if job else None,
            "raised_by_name": raiser.get("full_name") if raiser else None,
        })

    return {"disputes": enriched, "total": len(disputes), "page": page}


@router.get("/{dispute_id}")
async def get_dispute(dispute_id: str, user=Depends(get_admin_user), db=Depends(get_db)):
    """Get dispute details (admin only)."""
    dispute = await db.dispute.find_unique(where={"id": dispute_id})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    return dispute


@router.put("/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: str,
    data: ResolveDisputeRequest,
    user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Resolve a dispute (admin only)."""
    dispute = await db.dispute.find_unique(where={"id": dispute_id})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    await db.dispute.update(where={"id": dispute_id}, data={
        "status": "resolved",
        "resolution_notes": data.resolution_notes,
        "resolved_by": user["id"],
        # datetime object, not isoformat string — the SQLite DateTime column
        # rejects strings (this 500'd dispute resolution).
        "resolved_at": datetime.now(timezone.utc),
    })

    # Handle resolution action
    job_id = dispute.get("job_id")
    if data.action == "refund_client" and job_id:
        await db.job.update(where={"id": job_id}, data={"payment_status": "refunded", "status": "cancelled"})
    elif data.action == "pay_cleaner" and job_id:
        await db.job.update(where={"id": job_id}, data={"status": "completed"})
    elif data.action == "dismiss" and job_id:
        await db.job.update(where={"id": job_id}, data={"status": "completed"})

    await record_audit(db, event_type="dispute.resolved", actor=user,
                       target=dispute_id, details=f"Action: {data.action}")
    logger.info(f"Dispute {dispute_id} resolved by admin {user['id']}: {data.action}")
    return {"status": "resolved", "action": data.action}
