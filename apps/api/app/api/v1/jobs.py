"""
Jobs API for BookACleaner.ai
Handles job creation, listing, and status management
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
import logging

from app.database import get_db
from app.config import get_settings

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


# ==================== SCHEMAS ====================

class CreateJobRequest(BaseModel):
    cleaner_id: Optional[str] = None
    property_id: str
    services: List[str]
    scheduled_date: str
    scheduled_time: str
    description: Optional[str] = None
    job_type: str = "direct"
    estimated_hours: Optional[float] = None


class UpdateJobStatusRequest(BaseModel):
    status: str


class JobEstimateRequest(BaseModel):
    property_id: str
    services: List[str]
    add_ons: List[str] = []


# ==================== PRICE CALCULATION ====================

SERVICE_PRICES = {
    "standard": 100,
    "deep": 180,
    "airbnb": 120,
    "move-out": 250,
    "move_out": 250,
    "moveout": 250,
    "express": 80,
    "recurring": 90,
    "office": 150,
    "carpet": 80,
    "windows": 60,
    "laundry": 40,
    "fridge": 35,
    "oven": 35,
}


def calculate_price(services: List[str], sqft: int = 1500) -> float:
    """Calculate job price based on services and sqft"""
    base_multiplier = sqft / 1500  # Scale with sqft
    total = 0
    for service in services:
        price = SERVICE_PRICES.get(service.lower(), 100)
        total += price * base_multiplier
    return round(total, 2)


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


# ==================== ENDPOINTS ====================

@router.get("/")
async def list_jobs(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """List jobs for the authenticated user"""
    
    # Build query based on role
    if user["role"] == "cleaner":
        # Get cleaner profile
        cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
        if not cleaner:
            return []
        where = {"cleaner_id": cleaner["id"]}
    else:
        # Get client profile
        client = await db.client.find_first(where={"user_id": user["id"]})
        if not client:
            return []
        where = {"client_id": client["id"]}
    
    if status:
        where["status"] = status
    
    jobs = await db.job.find_many(where=where)
    
    # Enrich with property and cleaner data
    enriched = []
    for job in jobs:
        data = dict(job)
        
        # Get property
        if job.get("property_id"):
            prop = await db.properties.find_unique(where={"id": job["property_id"]})
            if prop:
                data["property"] = {
                    "id": prop["id"],
                    "name": prop.get("name"),
                    "address": prop.get("address"),
                }
        
        # Get cleaner
        if job.get("cleaner_id"):
            cleaner = await db.cleaner.find_unique(where={"id": job["cleaner_id"]})
            if cleaner:
                user_data = await db.user.find_unique(where={"id": cleaner["user_id"]})
                data["cleaner"] = {
                    "id": cleaner["id"],
                    "business_name": cleaner.get("business_name"),
                    "name": user_data.get("full_name") if user_data else None,
                    "rating": cleaner.get("rating"),
                }
        
        enriched.append(data)
    
    return enriched


@router.post("/")
async def create_job(
    data: CreateJobRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create a new job booking"""
    
    # Get or create client profile
    client = await db.client.find_first(where={"user_id": user["id"]})
    if not client and user["role"] == "client":
        client = await db.client.create(data={
            "user_id": user["id"],
            "display_name": user.get("full_name"),
        })
    
    if not client:
        raise HTTPException(status_code=400, detail="Client profile required")
    
    # Get property for sqft estimate
    prop = await db.properties.find_unique(where={"id": data.property_id})
    sqft = prop.get("sqft", 1500) if prop else 1500
    
    # Calculate price
    total_price = calculate_price(data.services, sqft)
    
    # Create job record
    job = await db.job.create(data={
        "client_id": client["id"],
        "cleaner_id": data.cleaner_id,
        "property_id": data.property_id,
        "title": f"{data.services[0].title()} Clean" if data.services else "Cleaning",
        "description": data.description,
        "services": data.services,
        "scheduled_date": datetime.fromisoformat(data.scheduled_date) if data.scheduled_date else None,
        "scheduled_time": data.scheduled_time,
        "estimated_hours": data.estimated_hours or len(data.services) * 1.5,
        "base_price": total_price,
        "total_price": total_price,
        "status": "pending",
    })
    
    return {
        "id": job["id"],
        "status": job["status"],
        "total_price": job["total_price"],
        "created_at": job.get("created_at"),
    }


@router.post("/estimate")
async def estimate_price(data: JobEstimateRequest, db = Depends(get_db)):
    """Estimate price for a job"""
    
    # Get property
    prop = await db.properties.find_unique(where={"id": data.property_id})
    
    sqft = 1500
    bedrooms = 2
    bathrooms = 2
    
    if prop:
        sqft = prop.get("sqft", 1500)
        bedrooms = prop.get("bedrooms", 2)
        bathrooms = prop.get("bathrooms", 2)
    
    # Calculate estimates per service
    base_multiplier = sqft / 1500
    estimates = {}
    for service in data.services:
        base_price = SERVICE_PRICES.get(service.lower(), 100)
        estimates[service] = round(base_price * base_multiplier, 2)
    
    # Add-ons
    add_on_total = 0
    for add_on in data.add_ons:
        add_on_price = SERVICE_PRICES.get(add_on.lower(), 30)
        estimates[f"addon_{add_on}"] = add_on_price
        add_on_total += add_on_price
    
    total = sum(v for k, v in estimates.items() if not k.startswith("addon_")) + add_on_total
    
    return {
        "estimated": True,
        "estimates": estimates,
        "total": round(total, 2),
        "based_on": {
            "sqft": sqft,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
        },
        "estimated_hours": len(data.services) * 1.5
    }


@router.get("/{job_id}")
async def get_job(
    job_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get job details"""
    
    job = await db.job.find_unique(where={"id": job_id})
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get property
    prop = None
    if job.get("property_id"):
        prop = await db.properties.find_unique(where={"id": job["property_id"]})
    
    # Get cleaner
    cleaner_info = None
    if job.get("cleaner_id"):
        cleaner = await db.cleaner.find_unique(where={"id": job["cleaner_id"]})
        if cleaner:
            cleaner_user = await db.user.find_unique(where={"id": cleaner["user_id"]})
            cleaner_info = {
                "id": cleaner["id"],
                "business_name": cleaner.get("business_name"),
                "name": cleaner_user.get("full_name") if cleaner_user else None,
                "rating": cleaner.get("rating"),
                "phone": cleaner_user.get("phone") if cleaner_user else None,
            }
    
    return {
        **job,
        "property": prop,
        "cleaner": cleaner_info,
    }


@router.patch("/{job_id}/status")
async def update_job_status(
    job_id: str,
    data: UpdateJobStatusRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Update job status"""
    
    valid_statuses = ["pending", "confirmed", "in_progress", "completed", "cancelled", "disputed"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    update_data = {"status": data.status}
    
    # Set timestamps
    if data.status == "in_progress":
        update_data["started_at"] = datetime.utcnow()
    elif data.status == "completed":
        update_data["completed_at"] = datetime.utcnow()
    
    job = await db.job.update(where={"id": job_id}, data=update_data)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"id": job_id, "status": data.status}


@router.post("/{job_id}/accept")
async def accept_job(
    job_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Cleaner accepts a job"""
    
    if user["role"] != "cleaner":
        raise HTTPException(status_code=403, detail="Only cleaners can accept jobs")
    
    cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
    if not cleaner:
        raise HTTPException(status_code=400, detail="Cleaner profile not found")
    
    job = await db.job.update(
        where={"id": job_id},
        data={
            "status": "confirmed",
            "cleaner_id": cleaner["id"]
        }
    )
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"id": job_id, "status": "confirmed"}


@router.post("/{job_id}/decline")
async def decline_job(
    job_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Cleaner declines a job"""
    
    job = await db.job.update(where={"id": job_id}, data={"status": "pending", "cleaner_id": None})
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"id": job_id, "status": "pending"}


@router.post("/{job_id}/start")
async def start_job(
    job_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Cleaner starts working on a job"""
    
    job = await db.job.update(
        where={"id": job_id},
        data={"status": "in_progress", "started_at": datetime.utcnow()}
    )
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"id": job_id, "status": "in_progress"}


@router.post("/{job_id}/complete")
async def complete_job(
    job_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Mark job as completed"""
    
    job = await db.job.update(
        where={"id": job_id},
        data={"status": "completed", "completed_at": datetime.utcnow()}
    )
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"id": job_id, "status": "completed"}


@router.post("/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Cancel a job"""
    
    job = await db.job.update(where={"id": job_id}, data={"status": "cancelled"})
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"id": job_id, "status": "cancelled"}
