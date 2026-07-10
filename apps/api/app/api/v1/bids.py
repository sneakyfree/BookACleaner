"""
Bidding/RFQ API for BookACleaner.ai
Allows cleaners to bid on marketplace jobs
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime, timezone
import logging
import math

from app.database import get_db
from app.config import get_settings
from app.api.deps import get_current_user

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


# ==================== SCHEMAS ====================

class CreateBidRequest(BaseModel):
    job_id: str
    amount: float = Field(gt=0, le=100000)
    message: Optional[str] = None
    estimated_hours: Optional[float] = Field(default=None, gt=0, le=24)
    available_start_time: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def _finite_amount(cls, v: float) -> float:
        if v is None or not math.isfinite(v):
            raise ValueError("amount must be a finite positive number")
        return v


class UpdateBidRequest(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0, le=100000)
    message: Optional[str] = None
    estimated_hours: Optional[float] = Field(default=None, gt=0, le=24)

    @field_validator("amount")
    @classmethod
    def _finite_amount(cls, v):
        if v is not None and not math.isfinite(v):
            raise ValueError("amount must be a finite positive number")
        return v


# ==================== AUTH HELPER ====================
@router.get("/marketplace")
async def list_marketplace_jobs(
    service: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """List open jobs in the marketplace that cleaners can bid on"""
    
    # Get all pending marketplace jobs (jobs without assigned cleaner)
    jobs = await db.job.find_many(where={"cleaner_id": None, "status": "pending"})
    
    # Apply filters
    filtered = jobs
    if service:
        filtered = [j for j in filtered if service in (j.get("services") or [])]
    if min_price:
        filtered = [j for j in filtered if (j.get("total_price") or 0) >= min_price]
    if max_price:
        filtered = [j for j in filtered if (j.get("total_price") or 0) <= max_price]
    
    # Sort by date descending
    filtered.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    
    # Paginate
    start = (page - 1) * limit
    end = start + limit
    
    return {
        "jobs": filtered[start:end],
        "total": len(filtered),
        "page": page,
        "pages": (len(filtered) + limit - 1) // limit
    }


# ==================== BID CRUD ====================

@router.post("/jobs/{job_id}/bids")
async def submit_bid(
    job_id: str,
    data: CreateBidRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Submit a bid on a marketplace job"""
    
    # Verify user is a cleaner
    if user.get("role") != "cleaner":
        raise HTTPException(status_code=403, detail="Only cleaners can submit bids")
    
    # Verify job exists and is open
    job = await db.job.find_unique(where={"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.get("cleaner_id"):
        raise HTTPException(status_code=400, detail="Job already has an assigned cleaner")
    
    # Get cleaner profile
    cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
    if not cleaner:
        raise HTTPException(status_code=400, detail="Cleaner profile not found")
    
    # Check for existing bid from this cleaner on this job
    existing = await db.bid.find_first(where={"job_id": job_id, "cleaner_id": cleaner["id"]})
    if existing:
        raise HTTPException(status_code=409, detail="You already have a bid on this job")
    
    # Create bid in the database
    bid = await db.bid.create(data={
        "job_id": job_id,
        "cleaner_id": cleaner["id"],
        "amount": data.amount,
        "message": data.message,
        "estimated_hours": data.estimated_hours,
        "status": "pending",
    })
    
    logger.info(f"Bid {bid['id']} created for job {job_id} by cleaner {cleaner['id']}")
    
    return {
        "success": True,
        "bid": bid,
        "message": "Bid submitted successfully"
    }


@router.get("/jobs/{job_id}/bids")
async def list_job_bids(
    job_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """List bids for a job.

    Authorization: the job's owning client (and admins) see every bid; a
    cleaner sees only their own bid on the job. Without this, any authenticated
    user could enumerate competitors' bid amounts and undercut them.
    """

    job = await db.job.find_unique(where={"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    is_admin = user.get("role") == "admin"
    client = await db.client.find_first(where={"user_id": user["id"]})
    is_owner = bool(client) and client["id"] == job.get("client_id")

    bids = await db.bid.find_many(where={"job_id": job_id})

    if not (is_admin or is_owner):
        # Cleaners may only see their own bid; everyone else sees nothing.
        cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
        if not cleaner:
            raise HTTPException(status_code=403, detail="Not authorized to view bids for this job")
        bids = [b for b in bids if b.get("cleaner_id") == cleaner["id"]]

    return {
        "job_id": job_id,
        "bids": bids,
        "total": len(bids)
    }


@router.post("/bids/{bid_id}/accept")
async def accept_bid(
    bid_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Accept a bid (client only)"""
    
    bid = await db.bid.find_unique(where={"id": bid_id})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    job = await db.job.find_unique(where={"id": bid["job_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Only the job's client can accept a bid
    client = await db.client.find_first(where={"user_id": user["id"]})
    if not client or client["id"] != job.get("client_id"):
        raise HTTPException(status_code=403, detail="Only the job owner can accept bids")

    # The bid must still be open — you cannot accept a declined/withdrawn/already
    # accepted bid.
    if bid.get("status") != "pending":
        raise HTTPException(status_code=409, detail=f"Bid is already {bid.get('status')}")

    # Atomically claim the job only if it is still unassigned and pending. This
    # compare-and-set prevents two concurrent accepts (or accepting a bid on an
    # already-confirmed job) from reassigning/repricing a live booking.
    claimed = await db.job.update_many(
        where={"id": bid["job_id"], "status": "pending", "cleaner_id": None},
        data={
            "cleaner_id": bid["cleaner_id"],
            "total_price": bid["amount"],
            "status": "confirmed",
        },
    )
    if not claimed:
        raise HTTPException(
            status_code=409,
            detail="Job is no longer open for bids (already assigned or not pending)",
        )

    # Mark the winning bid accepted (only if still pending — guards double-accept).
    accepted = await db.bid.update_many(
        where={"id": bid_id, "status": "pending"},
        data={"status": "accepted", "accepted_at": datetime.now(timezone.utc)},
    )
    if not accepted:
        # Lost a race on the bid itself after claiming the job; roll the job back.
        await db.job.update_many(
            where={"id": bid["job_id"], "cleaner_id": bid["cleaner_id"]},
            data={"cleaner_id": None, "status": "pending"},
        )
        raise HTTPException(status_code=409, detail=f"Bid is already {bid.get('status')}")

    # Decline all other pending bids on this job
    other_bids = await db.bid.find_many(where={"job_id": bid["job_id"]})
    for other in other_bids:
        if other["id"] != bid_id and other.get("status") == "pending":
            await db.bid.update(where={"id": other["id"]}, data={
                "status": "declined",
                "declined_at": datetime.now(timezone.utc),
            })
    
    return {
        "success": True,
        "message": "Bid accepted. Cleaner has been assigned to the job."
    }


@router.post("/bids/{bid_id}/decline")
async def decline_bid(
    bid_id: str,
    reason: Optional[str] = None,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Decline a bid (job's owning client only)"""

    bid = await db.bid.find_unique(where={"id": bid_id})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")

    job = await db.job.find_unique(where={"id": bid["job_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Only the job's owning client (or an admin) may decline a bid. Without this
    # any authenticated user could decline (sabotage) a rival cleaner's bid.
    is_admin = user.get("role") == "admin"
    client = await db.client.find_first(where={"user_id": user["id"]})
    if not is_admin and (not client or client["id"] != job.get("client_id")):
        raise HTTPException(status_code=403, detail="Only the job owner can decline bids")

    await db.bid.update(where={"id": bid_id}, data={
        "status": "declined",
        "declined_at": datetime.now(timezone.utc),
    })

    return {
        "success": True,
        "message": "Bid declined."
    }


@router.delete("/bids/{bid_id}")
async def withdraw_bid(
    bid_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Withdraw own bid (cleaner only)"""
    
    bid = await db.bid.find_unique(where={"id": bid_id})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    # Verify this is the cleaner's own bid
    cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
    if not cleaner or cleaner["id"] != bid.get("cleaner_id"):
        raise HTTPException(status_code=403, detail="You can only withdraw your own bids")
    
    await db.bid.update(where={"id": bid_id}, data={
        "status": "withdrawn",
        "withdrawn_at": datetime.now(timezone.utc),
    })
    
    return {
        "success": True,
        "message": "Bid withdrawn."
    }


@router.get("/my-bids")
async def list_my_bids(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """List bids submitted by current cleaner"""
    
    if user.get("role") != "cleaner":
        raise HTTPException(status_code=403, detail="Only cleaners can view their bids")
    
    cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
    if not cleaner:
        return {"bids": [], "total": 0, "page": page}
    
    where = {"cleaner_id": cleaner["id"]}
    if status:
        where["status"] = status
    
    bids = await db.bid.find_many(where=where)
    bids.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    
    start = (page - 1) * limit
    end = start + limit
    
    return {
        "bids": bids[start:end],
        "total": len(bids),
        "page": page
    }
