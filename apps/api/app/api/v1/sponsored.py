"""
Sponsored Listings API — G1
Cleaners can boost their visibility via paid sponsored placements.
Persists all data to the database via SponsoredListing model.
"""
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from typing import Optional
import logging

from app.database import get_db
from app.config import get_settings
from app.core.feature_flags import flags


router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


async def _get_user_id(authorization: str = Header(None)) -> str:
    """Extract user ID from JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    from jose import jwt, JWTError
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


class CreateSponsoredRequest(BaseModel):
    # Derived server-side from the authenticated cleaner; kept optional so the
    # client need not (and the cleaner page does not) send it. Was required,
    # which 422'd every purchase.
    cleaner_id: Optional[str] = None
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
async def create_sponsored_listing(
    data: CreateSponsoredRequest,
    user_id: str = Depends(_get_user_id),
    db=Depends(get_db),
):
    """Create a sponsored listing boost for a cleaner profile."""
    if not flags.sponsored_listings_enabled:
        raise HTTPException(status_code=503, detail="Sponsored listings are temporarily disabled")

    # Verify cleaner exists and belongs to user
    cleaner = await db.cleaner.find_first(where={"user_id": user_id})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner profile not found")

    cleaner_id = cleaner["id"]
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=data.duration_days)

    # Create listing as active (in production, would gate on Stripe checkout)
    listing = await db.sponsored_listing.create(data={
        "cleaner_id": cleaner_id,
        "status": "active",
        "priority": data.priority,
        "duration_days": data.duration_days,
        "starts_at": now,
        "expires_at": expires,
    })

    logger.info(f"Sponsored listing created for cleaner {cleaner_id}")
    
    return SponsoredListingResponse(
        id=listing["id"],
        cleaner_id=listing["cleaner_id"],
        status=listing["status"],
        priority=listing["priority"],
        starts_at=str(listing["starts_at"]),
        expires_at=str(listing["expires_at"]),
    )


@router.get("/my-listing")
async def get_my_listing(
    user_id: str = Depends(_get_user_id),
    db=Depends(get_db),
):
    """Return the calling user's active sponsored listing."""
    cleaner = await db.cleaner.find_first(where={"user_id": user_id})
    if not cleaner:
        return {"listing": None}

    now = datetime.now(timezone.utc)
    listings = await db.sponsored_listing.find_many(
        where={"cleaner_id": cleaner["id"], "status": "active"}
    )
    active = None
    for l in listings:
        exp = l.get("expires_at")
        if exp:
            try:
                exp_dt = datetime.fromisoformat(str(exp)) if isinstance(exp, str) else exp
                if exp_dt > now:
                    active = l
                    break
            except (ValueError, TypeError):
                pass

    if not active:
        return {"listing": None}

    return {
        "listing": {
            "id": active["id"],
            "cleaner_id": active["cleaner_id"],
            "priority": active["priority"],
            "status": active["status"],
            "starts_at": str(active.get("starts_at", "")),
            "expires_at": str(active.get("expires_at", "")),
        }
    }


@router.post("/cancel")
async def cancel_sponsored_listing(
    user_id: str = Depends(_get_user_id),
    db=Depends(get_db),
):
    """Cancel the calling user's active sponsored listing."""
    cleaner = await db.cleaner.find_first(where={"user_id": user_id})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner profile not found")

    listings = await db.sponsored_listing.find_many(
        where={"cleaner_id": cleaner["id"], "status": "active"}
    )
    if not listings:
        raise HTTPException(status_code=404, detail="No active sponsored listing found")

    for l in listings:
        await db.sponsored_listing.update(
            where={"id": l["id"]},
            data={"status": "cancelled"},
        )

    logger.info(f"Sponsored listing cancelled for cleaner {cleaner['id']}")
    return {"message": "Sponsored listing cancelled successfully"}


@router.get("/active")
async def get_active_sponsored(db=Depends(get_db)):
    """Return currently active sponsored cleaner listings."""
    all_listings = await db.sponsored_listing.find_many(where={"status": "active"})
    
    now = datetime.now(timezone.utc)
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
