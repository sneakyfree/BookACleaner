"""
Sponsored Listings API — G1
Cleaners can boost their visibility via paid sponsored placements.
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
    # For now, activate directly
    listing = {
        "id": f"spl-{now.strftime('%Y%m%d%H%M%S')}",
        "cleaner_id": data.cleaner_id,
        "status": "active",
        "priority": data.priority,
        "starts_at": now.isoformat(),
        "expires_at": expires.isoformat(),
    }

    logger.info(f"Sponsored listing created for cleaner {data.cleaner_id}")
    return SponsoredListingResponse(**listing)


@router.get("/active")
async def get_active_sponsored(db=Depends(get_db)):
    """Return currently active sponsored cleaner listings."""
    # In production, query SponsoredListing table WHERE status='active' AND expires_at > NOW()
    # For now, return demo data
    return {
        "sponsored": [
            {
                "cleaner_id": "demo-cleaner-1",
                "business_name": "Sparkle Clean Pro",
                "priority": 3,
                "expires_at": (datetime.utcnow() + timedelta(days=15)).isoformat(),
            },
            {
                "cleaner_id": "demo-cleaner-2",
                "business_name": "EcoFresh Cleaning",
                "priority": 2,
                "expires_at": (datetime.utcnow() + timedelta(days=22)).isoformat(),
            },
        ]
    }
