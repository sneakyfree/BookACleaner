"""
Cleaners API for BookACleaner.ai
Handles cleaner search, profiles, and availability
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

from app.database import get_db
from app.config import get_settings

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


# ==================== SCHEMAS ====================

class CleanerResponse(BaseModel):
    id: str
    businessName: str
    bio: Optional[str]
    profilePhoto: Optional[str]
    verificationTier: int
    overallRating: float
    totalReviews: int
    satisfactionPct: float


class UpdateCleanerProfileRequest(BaseModel):
    business_name: Optional[str] = None
    bio: Optional[str] = None
    hourly_rate: Optional[float] = None
    services: Optional[List[str]] = None
    service_areas: Optional[List[str]] = None


# ==================== AUTH HELPER ====================

async def get_current_user(authorization: str = Header(None), db = Depends(get_db)):
    """Get current user from Bearer token"""
    if not authorization or not authorization.startswith("Bearer "):
        return None  # Allow unauthenticated access for search
    
    from jose import jwt, JWTError
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None
    
    user = await db.user.find_unique(where={"id": user_id})
    return user


# ==================== ENDPOINTS ====================

@router.get("/")
async def search_cleaners(
    location: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None, alias="minRating"),
    min_tier: Optional[int] = Query(None, alias="minTier"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db = Depends(get_db)
):
    """Search for cleaners with filters"""
    
    # Get all cleaner profiles
    cleaners = await db.cleaner.find_many()
    
    # Apply filters
    results = []
    for c in cleaners:
        # Location filter
        service_areas = c.get("service_areas") or []
        if location and location.lower() not in [area.lower() for area in service_areas]:
            continue
        
        # Service filter
        services = c.get("services") or []
        if service and service.lower() not in [s.lower() for s in services]:
            continue
        
        # Rating filter
        if min_rating and (c.get("rating") or 0) < min_rating:
            continue
        
        # Tier filter
        if min_tier and (c.get("verification_tier") or 1) < min_tier:
            continue
        
        # Get user for name
        user = await db.user.find_unique(where={"id": c.get("user_id")})
        
        # Transform to response format
        results.append({
            "id": c.get("id"),
            "userId": c.get("user_id"),
            "businessName": c.get("business_name"),
            "name": user.get("full_name") if user else None,
            "bio": c.get("bio"),
            "profilePhoto": c.get("profile_photo") or (user.get("avatar_url") if user else None),
            "verificationTier": c.get("verification_tier") or 1,
            "overallRating": c.get("rating") or 0,
            "totalReviews": c.get("review_count") or 0,
            "completedJobs": c.get("completed_jobs") or 0,
            "hourlyRate": c.get("hourly_rate"),
            "services": c.get("services") or [],
            "serviceAreas": c.get("service_areas") or [],
            "onTimeRate": c.get("on_time_rate") or 100,
            "responseTimeMinutes": c.get("response_time_minutes"),
        })
    
    # Sort by rating descending
    results.sort(key=lambda x: x.get("overallRating", 0), reverse=True)
    
    # Paginate
    start = (page - 1) * limit
    end = start + limit
    
    return {
        "cleaners": results[start:end],
        "total": len(results),
        "page": page,
        "limit": limit,
    }


@router.get("/me")
async def get_my_cleaner_profile(
    authorization: str = Header(None),
    db = Depends(get_db)
):
    """Get current cleaner's profile"""
    
    user = await get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") != "cleaner":
        raise HTTPException(status_code=403, detail="Not a cleaner account")
    
    cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
    
    if not cleaner:
        # Create profile if doesn't exist
        cleaner = await db.cleaner.create(data={
            "user_id": user["id"],
            "business_name": user.get("full_name") or "My Cleaning Service",
        })
    
    return {
        **cleaner,
        "user": {
            "email": user["email"],
            "full_name": user.get("full_name"),
            "phone": user.get("phone"),
        }
    }


@router.patch("/me")
async def update_my_cleaner_profile(
    data: UpdateCleanerProfileRequest,
    authorization: str = Header(None),
    db = Depends(get_db)
):
    """Update current cleaner's profile"""
    
    user = await get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") != "cleaner":
        raise HTTPException(status_code=403, detail="Not a cleaner account")
    
    cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner profile not found")
    
    # Build update data
    update_data = {}
    for field, value in data.model_dump().items():
        if value is not None:
            update_data[field] = value
    
    if not update_data:
        return cleaner
    
    updated = await db.cleaner.update(where={"id": cleaner["id"]}, data=update_data)
    
    return updated


@router.get("/{cleaner_id}")
async def get_cleaner(cleaner_id: str, db = Depends(get_db)):
    """Get cleaner profile by ID"""
    
    cleaner = await db.cleaner.find_unique(where={"id": cleaner_id})
    
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner not found")
    
    # Get user info
    user = await db.user.find_unique(where={"id": cleaner.get("user_id")})
    
    return {
        "id": cleaner.get("id"),
        "businessName": cleaner.get("business_name"),
        "name": user.get("full_name") if user else None,
        "bio": cleaner.get("bio"),
        "profilePhoto": cleaner.get("profile_photo") or (user.get("avatar_url") if user else None),
        "verificationTier": cleaner.get("verification_tier") or 1,
        "overallRating": cleaner.get("rating") or 0,
        "totalReviews": cleaner.get("review_count") or 0,
        "completedJobs": cleaner.get("completed_jobs") or 0,
        "hourlyRate": cleaner.get("hourly_rate"),
        "services": cleaner.get("services") or [],
        "serviceAreas": cleaner.get("service_areas") or [],
        "onTimeRate": cleaner.get("on_time_rate") or 100,
        "repeatClientRate": cleaner.get("repeat_client_rate") or 0,
    }


@router.get("/{cleaner_id}/availability")
async def get_cleaner_availability(
    cleaner_id: str,
    date: Optional[str] = Query(None),
    db = Depends(get_db)
):
    """Get cleaner's availability for a specific date"""
    
    cleaner = await db.cleaner.find_unique(where={"id": cleaner_id})
    
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner not found")
    
    # In production, would check against actual calendar/bookings
    # For now, return mock available slots
    slots = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
    
    # Simulate some slots being taken
    if date:
        # Remove some slots based on date hash
        date_hash = sum(ord(c) for c in date)
        slots = [s for i, s in enumerate(slots) if i % 3 != date_hash % 3]
    
    return {"date": date, "slots": slots, "timezone": "America/Los_Angeles"}


@router.get("/{cleaner_id}/reviews")
async def get_cleaner_reviews(
    cleaner_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db = Depends(get_db)
):
    """Get reviews for a cleaner"""
    
    # Get cleaner's user_id to find reviews
    cleaner = await db.cleaner.find_unique(where={"id": cleaner_id})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner not found")
    
    # Get reviews where cleaner is the subject
    all_reviews = await db.review.find_many()
    
    # Filter reviews for this cleaner's jobs
    jobs = await db.job.find_many(where={"cleaner_id": cleaner_id})
    job_ids = {j["id"] for j in jobs}
    
    reviews = [r for r in all_reviews if r.get("job_id") in job_ids]
    
    # Sort by date descending
    reviews.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    
    # Paginate
    start = (page - 1) * limit
    end = start + limit
    paginated = reviews[start:end]
    
    # Enrich with author info
    enriched = []
    for r in paginated:
        author = await db.user.find_unique(where={"id": r.get("author_id")})
        enriched.append({
            **r,
            "author": {
                "name": author.get("full_name") if author else "Anonymous",
                "avatar": author.get("avatar_url") if author else None,
            } if author else None,
        })
    
    return {
        "reviews": enriched,
        "total": len(reviews),
        "page": page,
        "limit": limit,
    }
