"""
Newsfeed API for BookACleaner.ai
Provides personalized content feed for users
"""
from fastapi import APIRouter, HTTPException, Depends, Query
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

class FeedItem(BaseModel):
    id: str
    type: str  # announcement, tip, promo, feature, community
    title: str
    content: str
    image_url: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    target_roles: List[str] = ["client", "cleaner"]
    priority: int = 0
    likes: int = 0
    views: int = 0
    created_at: datetime


class CreateFeedItemRequest(BaseModel):
    type: str
    title: str
    content: str
    image_url: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    target_roles: List[str] = ["client", "cleaner"]
    priority: int = 0


# ==================== DEMO FEED CONTENT ====================

DEMO_FEED_ITEMS = [
    {
        "id": "feed-1",
        "type": "announcement",
        "title": "🎉 Welcome to BookACleaner.ai!",
        "content": "We're excited to have you join our community of trusted cleaning professionals and happy clients. Check out our getting started guide to make the most of the platform.",
        "cta_text": "Get Started",
        "cta_url": "/getting-started",
        "target_roles": ["client", "cleaner"],
        "priority": 100,
        "likes": 234,
        "views": 1523,
        "created_at": "2026-01-25T10:00:00Z"
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
        "created_at": "2026-01-24T14:00:00Z"
    },
    {
        "id": "feed-3",
        "type": "promo",
        "title": "🏠 20% Off Your First Deep Clean",
        "content": "New clients get 20% off their first deep cleaning service. Use code CLEANHOME at checkout.",
        "image_url": "/images/feed/promo-deep-clean.jpg",
        "cta_text": "Book Now",
        "cta_url": "/book",
        "target_roles": ["client"],
        "priority": 90,
        "likes": 89,
        "views": 1245,
        "created_at": "2026-01-23T09:00:00Z"
    },
    {
        "id": "feed-4",
        "type": "feature",
        "title": "✨ New: Airbnb Calendar Sync",
        "content": "Vacation rental owners can now sync their Airbnb calendar to automatically schedule turnover cleanings. Never miss a checkout again!",
        "cta_text": "Learn More",
        "cta_url": "/features/airbnb-sync",
        "target_roles": ["client"],
        "priority": 70,
        "likes": 67,
        "views": 534,
        "created_at": "2026-01-22T16:00:00Z"
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
        "created_at": "2026-01-21T12:00:00Z"
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
    """Get personalized news feed"""
    
    # Start with demo items (in production, fetch from database)
    items = DEMO_FEED_ITEMS.copy()
    
    # Filter by role
    if role:
        items = [i for i in items if role in i["target_roles"]]
    
    # Filter by type
    if type:
        items = [i for i in items if i["type"] == type]
    
    # Sort by priority and date
    items.sort(key=lambda x: (-x["priority"], x["created_at"]), reverse=False)
    
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
    
    for item in DEMO_FEED_ITEMS:
        if item["id"] == item_id:
            return item
    
    raise HTTPException(status_code=404, detail="Feed item not found")


@router.post("/{item_id}/like")
async def like_feed_item(
    item_id: str,
    db = Depends(get_db)
):
    """Like a feed item"""
    
    for item in DEMO_FEED_ITEMS:
        if item["id"] == item_id:
            item["likes"] += 1
            return {"success": True, "likes": item["likes"]}
    
    raise HTTPException(status_code=404, detail="Feed item not found")


@router.post("/{item_id}/view")
async def track_view(
    item_id: str,
    db = Depends(get_db)
):
    """Track feed item view"""
    
    for item in DEMO_FEED_ITEMS:
        if item["id"] == item_id:
            item["views"] += 1
            return {"success": True}
    
    return {"success": False}


# Admin endpoints
@router.post("")
async def create_feed_item(
    data: CreateFeedItemRequest,
    db = Depends(get_db)
):
    """Create a new feed item (admin only)"""
    
    new_item = {
        "id": f"feed-{len(DEMO_FEED_ITEMS) + 1}",
        **data.dict(),
        "likes": 0,
        "views": 0,
        "created_at": datetime.utcnow().isoformat()
    }
    
    DEMO_FEED_ITEMS.insert(0, new_item)
    
    return {"success": True, "item": new_item}
