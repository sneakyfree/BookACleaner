"""
Newsfeed API for BookACleaner.ai
Provides personalized content feed for users.
Feed items are stored in the database via the FeedItem model.
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Query
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

class CreateFeedItemRequest(BaseModel):
    type: str
    title: str
    content: str
    image_url: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    target_roles: List[str] = ["client", "cleaner"]
    priority: int = 0


# ==================== AUTH HELPER ====================
DEMO_FEED_ITEMS = [
    {
        "id": "feed-1",
        "type": "announcement",
        "title": "🎉 Welcome to BookACleaner.ai!",
        "content": "We're excited to have you join our community of trusted cleaning professionals and happy clients. Check out our getting started guide to make the most of the platform.",
        "cta_text": "Get Started",
        "cta_url": "/welcome",
        "target_roles": ["client", "cleaner"],
        "priority": 100,
        "likes": 234,
        "views": 1523,
    },
    {
        "id": "feed-2",
        "type": "tip",
        "title": "💡 Pro Tip: Complete Your Profile",
        "content": "Cleaners with complete profiles get 3x more bookings. Add your experience, certifications, and a professional photo to stand out!",
        "image_url": "/images/feed/profile-tip.jpg",
        "cta_text": "Update Profile",
        "cta_url": "/cleaner/settings",
        "target_roles": ["cleaner"],
        "priority": 80,
        "likes": 156,
        "views": 892,
    },
    {
        "id": "feed-3",
        "type": "promo",
        "title": "🏠 20% Off Your First Deep Clean",
        "content": "New clients get 20% off their first deep cleaning service. Use code CLEANHOME at checkout.",
        "image_url": "/images/feed/promo-deep-clean.jpg",
        "cta_text": "Book Now",
        "cta_url": "/client/book",
        "target_roles": ["client"],
        "priority": 90,
        "likes": 89,
        "views": 1245,
    },
    {
        "id": "feed-4",
        "type": "feature",
        "title": "✨ New: Airbnb Calendar Sync",
        "content": "Vacation rental owners can now sync their Airbnb calendar to automatically schedule turnover cleanings. Never miss a checkout again!",
        "cta_text": "Learn More",
        "cta_url": "/cleaner/calendar-sync",
        "target_roles": ["client"],
        "priority": 70,
        "likes": 67,
        "views": 534,
    },
    {
        "id": "feed-5",
        "type": "community",
        "title": "👏 Top Cleaner: Maria Santos",
        "content": "Congratulations to Maria for completing 500 jobs with a 4.95 rating! Thank you for being an amazing part of our community.",
        "image_url": "/images/feed/top-cleaner-maria.jpg",
        "target_roles": ["client", "cleaner"],
        "priority": 60,
        "likes": 312,
        "views": 2341,
    }
]


# ==================== ENDPOINTS ====================

@router.get("")
async def get_feed(
    role: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db = Depends(get_db)
):
    """Get personalized news feed from database"""
    
    # Fetch items from database
    items = await db.feed_item.find_many()
    
    # If no items in DB, seed demo items
    if not items:
        logger.info("Seeding feed with demo items...")
        for demo in DEMO_FEED_ITEMS:
            await db.feed_item.create(data=demo)
        items = await db.feed_item.find_many()
    
    # Filter by role
    if role:
        items = [i for i in items if role in (i.get("target_roles") or [])]
    
    # Filter by type
    if type:
        items = [i for i in items if i.get("type") == type]
    
    # Sort by priority (desc) then date
    items.sort(key=lambda x: (-x.get("priority", 0), x.get("created_at") or ""))
    
    # Paginate
    start = (page - 1) * limit
    end = start + limit
    
    return {
        "items": items[start:end],
        "total": len(items),
        "page": page,
        "pages": (len(items) + limit - 1) // limit,
        "has_more": end < len(items)
    }


@router.get("/{item_id}")
async def get_feed_item(
    item_id: str,
    db = Depends(get_db)
):
    """Get a specific feed item"""
    
    item = await db.feed_item.find_unique(where={"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Feed item not found")
    return item


@router.post("/{item_id}/like")
async def like_feed_item(
    item_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Like a feed item (requires auth)"""
    
    item = await db.feed_item.find_unique(where={"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Feed item not found")
    
    new_likes = (item.get("likes") or 0) + 1
    await db.feed_item.update(where={"id": item_id}, data={"likes": new_likes})
    
    return {"success": True, "likes": new_likes}


@router.post("/{item_id}/view")
async def track_view(
    item_id: str,
    db = Depends(get_db)
):
    """Track feed item view"""
    
    item = await db.feed_item.find_unique(where={"id": item_id})
    if not item:
        return {"success": False}
    
    new_views = (item.get("views") or 0) + 1
    await db.feed_item.update(where={"id": item_id}, data={"views": new_views})
    
    return {"success": True}


# ==================== ADMIN ENDPOINTS ====================

@router.post("")
async def create_feed_item(
    data: CreateFeedItemRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create a new feed item (admin only)"""
    
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    new_item = await db.feed_item.create(data={
        **data.dict(),
        "likes": 0,
        "views": 0,
    })
    
    return {"success": True, "item": new_item}


class UpdateFeedItemRequest(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    target_roles: Optional[List[str]] = None
    priority: Optional[int] = None


@router.patch("/{item_id}")
async def update_feed_item(
    item_id: str,
    data: UpdateFeedItemRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Update a feed item (admin only)."""

    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    payload = data.dict(exclude_unset=True)
    existing = await db.feed_item.find_unique(where={"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Feed item not found")

    updated = await db.feed_item.update(where={"id": item_id}, data=payload)
    return {"success": True, "item": updated}


@router.delete("/{item_id}")
async def delete_feed_item(
    item_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Delete a feed item (admin only)."""

    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    existing = await db.feed_item.find_unique(where={"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Feed item not found")

    await db.feed_item.delete(where={"id": item_id})
    return {"success": True}
