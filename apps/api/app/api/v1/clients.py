"""
Clients API for BookACleaner.ai
Handles client profile and dashboard statistics
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

from app.database import get_db
from app.config import get_settings
from app.api.deps import get_current_user

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


# ==================== SCHEMAS ====================

class UpdateClientProfileRequest(BaseModel):
    display_name: Optional[str] = None
    phone: Optional[str] = None
    default_address: Optional[str] = None
    notification_preferences: Optional[dict] = None


# ==================== AUTH HELPER ====================
@router.get("/profile")
async def get_client_profile(
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get current client's profile"""
    
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Not a client account")
    
    client = await db.client.find_first(where={"user_id": user["id"]})
    
    if not client:
        # Create profile if doesn't exist
        client = await db.client.create(data={
            "user_id": user["id"],
            "display_name": user.get("full_name"),
        })
    
    return {
        **client,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user.get("full_name"),
            "phone": user.get("phone"),
            "avatar_url": user.get("avatar_url"),
        }
    }


@router.patch("/profile")
async def update_client_profile(
    data: UpdateClientProfileRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Update client profile"""
    
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Not a client account")
    
    client = await db.client.find_first(where={"user_id": user["id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client profile not found")
    
    # Build update data
    update_data = {}
    for field, value in data.model_dump().items():
        if value is not None:
            update_data[field] = value
    
    if not update_data:
        return client
    
    updated = await db.client.update(where={"id": client["id"]}, data=update_data)
    
    return updated


@router.get("/stats")
async def get_client_stats(
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get client dashboard stats"""
    
    client = await db.client.find_first(where={"user_id": user["id"]})
    
    if not client:
        return {
            "upcomingJobs": 0,
            "properties": 0,
            "completedJobs": 0,
            "totalSpent": 0,
        }
    
    # Count jobs
    all_jobs = await db.job.find_many(where={"client_id": client["id"]})
    
    upcoming = sum(1 for j in all_jobs if j.get("status") in ["pending", "confirmed"])
    completed = sum(1 for j in all_jobs if j.get("status") == "completed")
    total_spent = sum(j.get("total_price") or 0 for j in all_jobs if j.get("status") == "completed")
    
    # Count properties
    properties = await db.properties.find_many(where={"client_id": client["id"]})
    
    return {
        "upcomingJobs": upcoming,
        "properties": len(properties),
        "completedJobs": completed,
        "totalSpent": round(total_spent, 2),
        "favoriteCleaners": 0,  # Would need favorites table
    }


@router.get("/bookings")
async def get_client_bookings(
    status: Optional[str] = None,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get client's bookings/jobs"""
    
    client = await db.client.find_first(where={"user_id": user["id"]})
    if not client:
        return []
    
    where = {"client_id": client["id"]}
    if status:
        where["status"] = status
    
    jobs = await db.job.find_many(where=where)
    
    # Enrich with cleaner and property info
    enriched = []
    for job in jobs:
        data = dict(job)
        
        if job.get("cleaner_id"):
            cleaner = await db.cleaner.find_unique(where={"id": job["cleaner_id"]})
            if cleaner:
                cleaner_user = await db.user.find_unique(where={"id": cleaner["user_id"]})
                data["cleaner"] = {
                    "id": cleaner["id"],
                    "business_name": cleaner.get("business_name"),
                    "name": cleaner_user.get("full_name") if cleaner_user else None,
                    "rating": cleaner.get("rating"),
                }
        
        if job.get("property_id"):
            prop = await db.properties.find_unique(where={"id": job["property_id"]})
            if prop:
                data["property"] = {
                    "id": prop["id"],
                    "name": prop.get("name"),
                    "address": prop.get("address"),
                }
        
        enriched.append(data)
    
    return enriched
