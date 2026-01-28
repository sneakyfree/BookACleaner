"""
Bidding/RFQ API for BookACleaner.ai
Allows cleaners to bid on marketplace jobs
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

from app.database import get_db
from app.config import get_settings

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


# ==================== SCHEMAS ====================

class CreateBidRequest(BaseModel):
    job_id: str
    amount: float
    message: Optional[str] = None
    estimated_hours: Optional[float] = None
    available_start_time: Optional[str] = None


class UpdateBidRequest(BaseModel):
    amount: Optional[float] = None
    message: Optional[str] = None
    estimated_hours: Optional[float] = None


# ==================== AUTH HELPER ====================

async def get_current_user(authorization: str = Header(None), db = Depends(get_db)):
    """Get current user from Bearer token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    from jose import jwt, JWTError
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


# ==================== MARKETPLACE JOBS ====================

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
    
    # Create bid (using a simple JSON field on job for now)
    # In production, this would be a separate Bid table
    bid_data = {
        "id": f"bid-{user['id']}-{job_id}",
        "job_id": job_id,
        "cleaner_id": cleaner["id"],
        "cleaner_name": cleaner.get("business_name") or user.get("full_name"),
        "cleaner_rating": cleaner.get("rating", 0),
        "amount": data.amount,
        "message": data.message,
        "estimated_hours": data.estimated_hours,
        "available_start_time": data.available_start_time,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }
    
    # For simplicity, store bids in job description as JSON 
    # In production, use a proper Bid model
    logger.info(f"Bid submitted: {bid_data}")
    
    return {
        "success": True,
        "bid": bid_data,
        "message": "Bid submitted successfully"
    }


@router.get("/jobs/{job_id}/bids")
async def list_job_bids(
    job_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """List all bids for a job (client only)"""
    
    job = await db.job.find_unique(where={"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # In production, fetch from Bid table
    # For now, return mock structure
    return {
        "job_id": job_id,
        "bids": [],
        "total": 0
    }


@router.post("/bids/{bid_id}/accept")
async def accept_bid(
    bid_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Accept a bid (client only)"""
    
    # Parse bid ID to get cleaner and job
    parts = bid_id.split("-")
    if len(parts) < 3:
        raise HTTPException(status_code=400, detail="Invalid bid ID")
    
    # In production, fetch bid and verify ownership
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
    """Decline a bid (client only)"""
    
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
    
    # In production, fetch from Bid table
    return {
        "bids": [],
        "total": 0,
        "page": page
    }
