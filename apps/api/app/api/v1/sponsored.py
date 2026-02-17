"""
Sponsored Listings API — G1
Cleaners can boost their visibility via paid sponsored placements.
Persists all data to the database via SponsoredListing model.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging

from app.database import get_db
from app.config import get_settings

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


class CreateSponsoredRequest(BaseModel):
    cleaner_id: str
    duration_days: int = 30  # default 30-day boost
    priority: int = 1  # 1=standard, 2=premium, 3=featured


class SponsoredListingResponse(BaseModel):
    id: str
    cleaner_id: str
    status: str
    priority: int
    starts_at: str
    expires_at: str


@router.post("/create", response_model=SponsoredListingResponse)
async def create_sponsored_listing(data: CreateSponsoredRequest, db=Depends(get_db)):
    """Create a sponsored listing boost for a cleaner profile."""

    # Verify cleaner exists
    cleaner = await db.cleaner.find_unique(where={"id": data.cleaner_id})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner profile not found")

    now = datetime.utcnow()
    expires = now + timedelta(days=data.duration_days)

    # In production, would create Stripe checkout then activate on payment
    # For now, activate directly and persist to DB
    listing = await db.sponsored_listing.create(data={
        "cleaner_id": data.cleaner_id,
        "status": "active",
        "priority": data.priority,
        "duration_days": data.duration_days,
        "starts_at": now,
        "expires_at": expires,
    })

    logger.info(f"Sponsored listing created for cleaner {data.cleaner_id}")
    
    return SponsoredListingResponse(
        id=listing["id"],
        cleaner_id=listing["cleaner_id"],
        status=listing["status"],
        priority=listing["priority"],
        starts_at=str(listing["starts_at"]),
        expires_at=str(listing["expires_at"]),
    )


@router.get("/active")
async def get_active_sponsored(db=Depends(get_db)):
    """Return currently active sponsored cleaner listings."""
    # Query all sponsored listings from DB
    all_listings = await db.sponsored_listing.find_many(where={"status": "active"})
    
    # Filter to only non-expired listings
    now = datetime.utcnow()
    active = []
    for listing in all_listings:
        expires_at = listing.get("expires_at")
        if expires_at:
            try:
                exp = datetime.fromisoformat(str(expires_at)) if isinstance(expires_at, str) else expires_at
                if exp > now:
                    active.append(listing)
            except (ValueError, TypeError):
                pass
    
    # Sort by priority descending (featured first)
    active.sort(key=lambda x: x.get("priority", 1), reverse=True)
    
    return {
        "sponsored": [
            {
                "id": l["id"],
                "cleaner_id": l["cleaner_id"],
                "priority": l["priority"],
                "status": l["status"],
                "starts_at": str(l.get("starts_at", "")),
                "expires_at": str(l.get("expires_at", "")),
            }
            for l in active
        ]
    }
