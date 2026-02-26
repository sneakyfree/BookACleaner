"""
Service Categories API
Provides service taxonomy for the booking wizard
"""

from fastapi import APIRouter

router = APIRouter()

# Service categories with standard pricing
SERVICE_CATEGORIES = [
    {
        "id": "standard_clean",
        "name": "Standard Clean",
        "description": "Regular cleaning service for homes and apartments",
        "base_price": 120,
        "estimated_hours": 2.0,
        "icon": "sparkles",
    },
    {
        "id": "deep_clean",
        "name": "Deep Clean",
        "description": "Thorough deep cleaning including hard-to-reach areas",
        "base_price": 200,
        "estimated_hours": 4.0,
        "icon": "sparkles",
    },
    {
        "id": "move_in_out",
        "name": "Move-In/Out Clean",
        "description": "Complete cleaning for moving in or out of a property",
        "base_price": 250,
        "estimated_hours": 5.0,
        "icon": "home",
    },
    {
        "id": "airbnb_turnover",
        "name": "Airbnb Turnover",
        "description": "Quick turnover cleaning between short-term rental guests",
        "base_price": 150,
        "estimated_hours": 2.5,
        "icon": "key",
    },
    {
        "id": "post_construction",
        "name": "Post-Construction Clean",
        "description": "Heavy-duty cleaning after renovation or construction",
        "base_price": 350,
        "estimated_hours": 6.0,
        "icon": "hammer",
    },
    {
        "id": "carpet_cleaning",
        "name": "Carpet Cleaning",
        "description": "Professional carpet shampooing and stain removal",
        "base_price": 180,
        "estimated_hours": 3.0,
        "icon": "layers",
    },
]


@router.get("/categories")
async def get_service_categories():
    """Return all available service categories with pricing"""
    return {
        "categories": SERVICE_CATEGORIES,
        "currency": "USD",
    }


@router.get("/categories/{category_id}")
async def get_service_category(category_id: str):
    """Return a specific service category"""
    for cat in SERVICE_CATEGORIES:
        if cat["id"] == category_id:
            return cat
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Service category not found")
