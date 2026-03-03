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
from app.cache import get_cache, CacheClient
import hashlib
from app.api.deps import get_current_user

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
@router.get("/")
async def search_cleaners(
    location: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None, alias="minRating"),
    min_tier: Optional[int] = Query(None, alias="minTier"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db = Depends(get_db),
    cache: CacheClient = Depends(get_cache),
):
    """Search for cleaners with filters"""

    # Cache key from query params
    key_raw = f"cleaners:search:{location}:{service}:{min_rating}:{min_tier}:{page}:{limit}"
    cache_key = f"cleaners:search:{hashlib.md5(key_raw.encode()).hexdigest()}"

    cached = await cache.get_json(cache_key)
    if cached:
        return cached
    
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
    
    result = {
        "cleaners": results[start:end],
        "total": len(results),
        "page": page,
        "limit": limit,
    }

    # Cache for 60 seconds
    await cache.set_json(cache_key, result, ttl=60)

    return result


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


# ==================== AVAILABILITY MANAGEMENT ====================
# NOTE: These /me/* routes MUST be defined BEFORE /{cleaner_id}/* routes
# because FastAPI matches in order and would treat "me" as a cleaner_id.

class AvailabilitySlot(BaseModel):
    day_of_week: int  # 0-6
    start_time: str   # "08:00"
    end_time: str      # "17:00"
    is_available: bool = True

class AvailabilityUpdateRequest(BaseModel):
    schedule: List[AvailabilitySlot]


@router.get("/me/availability")
async def get_my_availability(
    authorization: str = Header(None),
    db = Depends(get_db)
):
    """Get current cleaner's availability schedule"""
    user = await get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner profile not found")
    
    return await get_cleaner_availability(cleaner["id"], db=db)


@router.put("/me/availability")
async def update_my_availability(
    data: AvailabilityUpdateRequest,
    authorization: str = Header(None),
    db = Depends(get_db)
):
    """Update current cleaner's weekly availability"""
    user = await get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner profile not found")
    
    # Upsert each day
    for slot in data.schedule:
        if slot.day_of_week < 0 or slot.day_of_week > 6:
            continue
        existing = await db.availability.find_first(
            where={"cleaner_id": cleaner["id"], "day_of_week": slot.day_of_week}
        )
        if existing:
            await db.availability.update(
                where={"id": existing["id"]},
                data={
                    "start_time": slot.start_time,
                    "end_time": slot.end_time,
                    "is_available": slot.is_available,
                }
            )
        else:
            await db.availability.create(data={
                "cleaner_id": cleaner["id"],
                "day_of_week": slot.day_of_week,
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "is_available": slot.is_available,
            })
    
    return {"message": "Availability updated", "schedule": data.schedule}


# ==================== PORTFOLIO PHOTOS ====================

@router.get("/me/portfolio")
async def get_my_portfolio(
    authorization: str = Header(None),
    db = Depends(get_db)
):
    """Get current cleaner's portfolio photos"""
    user = await get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner profile not found")
    
    photos = await db.portfolio_photo.find_many(where={"cleaner_id": cleaner["id"]})
    photos.sort(key=lambda p: p.get("display_order", 0))
    return {"photos": photos}


@router.post("/me/portfolio")
async def add_portfolio_photo(
    url: str,
    caption: Optional[str] = None,
    authorization: str = Header(None),
    db = Depends(get_db)
):
    """Add a photo to the cleaner's portfolio"""
    user = await get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner profile not found")
    
    # Get current count for ordering
    existing = await db.portfolio_photo.find_many(where={"cleaner_id": cleaner["id"]})
    
    photo = await db.portfolio_photo.create(data={
        "cleaner_id": cleaner["id"],
        "url": url,
        "caption": caption,
        "display_order": len(existing),
    })
    return photo


@router.delete("/me/portfolio/{photo_id}")
async def delete_portfolio_photo(
    photo_id: str,
    authorization: str = Header(None),
    db = Depends(get_db)
):
    """Delete a portfolio photo"""
    user = await get_current_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner profile not found")
    
    photo = await db.portfolio_photo.find_unique(where={"id": photo_id})
    if not photo or photo.get("cleaner_id") != cleaner["id"]:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    await db.portfolio_photo.delete(where={"id": photo_id})
    return {"message": "Photo deleted"}

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
    """Get cleaner's weekly availability schedule"""
    
    cleaner = await db.cleaner.find_unique(where={"id": cleaner_id})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner not found")
    
    avail_records = await db.availability.find_many(where={"cleaner_id": cleaner_id})
    
    # Build a 7-day schedule (0=Mon, 6=Sun)
    schedule = {}
    for a in avail_records:
        schedule[a.get("day_of_week")] = {
            "day_of_week": a.get("day_of_week"),
            "start_time": a.get("start_time"),
            "end_time": a.get("end_time"),
            "is_available": a.get("is_available", True),
        }
    
    # Fill missing days with defaults
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    full_schedule = []
    for d in range(7):
        if d in schedule:
            full_schedule.append({**schedule[d], "day_name": day_names[d]})
        else:
            full_schedule.append({
                "day_of_week": d,
                "day_name": day_names[d],
                "start_time": "08:00",
                "end_time": "17:00",
                "is_available": d < 5,  # Mon-Fri by default
            })
    
    return {"schedule": full_schedule, "cleaner_id": cleaner_id}


@router.get("/{cleaner_id}/available-slots")
async def get_available_slots(
    cleaner_id: str,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db = Depends(get_db)
):
    """Get available time slots for a specific date, considering existing bookings"""
    
    cleaner = await db.cleaner.find_unique(where={"id": cleaner_id})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner not found")
    
    from datetime import datetime as dt
    try:
        target_date = dt.strptime(date, "%Y-%m-%d")
        day_of_week = target_date.weekday()  # 0=Mon, 6=Sun
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Check availability for this day of week
    avail = await db.availability.find_first(
        where={"cleaner_id": cleaner_id, "day_of_week": day_of_week}
    )
    
    if avail and not avail.get("is_available", True):
        return {"date": date, "slots": [], "message": "Cleaner is not available on this day"}
    
    start_hour = int((avail.get("start_time") or "08:00").split(":")[0]) if avail else 8
    end_hour = int((avail.get("end_time") or "17:00").split(":")[0]) if avail else 17
    
    # Generate hourly slots
    all_slots = [f"{h:02d}:00" for h in range(start_hour, end_hour)]
    
    # Get existing jobs on this date to remove booked slots
    all_jobs = await db.job.find_many(where={"cleaner_id": cleaner_id})
    booked_times = set()
    for job in all_jobs:
        job_date = job.get("scheduled_date")
        if job_date and str(job_date)[:10] == date and job.get("status") not in ("cancelled",):
            booked_time = job.get("scheduled_time")
            if booked_time:
                booked_times.add(booked_time[:5])
                # Block estimated hours around the booking
                est_hours = int(job.get("estimated_hours") or 2)
                start_h = int(booked_time[:2])
                for offset in range(1, est_hours):
                    booked_times.add(f"{start_h + offset:02d}:00")
    
    available_slots = [s for s in all_slots if s not in booked_times]
    
    return {"date": date, "slots": available_slots, "timezone": "America/Los_Angeles"}


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

