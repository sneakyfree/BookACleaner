"""
Properties API for BookACleaner.ai
Handles property CRUD for clients
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

from app.database import get_db
from app.config import get_settings
from app.api.deps import get_current_user

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


# ==================== SCHEMAS ====================

class CreatePropertyRequest(BaseModel):
    name: Optional[str] = None
    address: str
    address_line_2: Optional[str] = None
    city: str
    state: str
    zip_code: str
    country: str = "US"
    sqft: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    property_type: Optional[str] = "house"
    airbnb_calendar_url: Optional[str] = None
    access_info: Optional[str] = None
    special_notes: Optional[str] = None


class UpdatePropertyRequest(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    sqft: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    property_type: Optional[str] = None
    airbnb_calendar_url: Optional[str] = None
    access_info: Optional[str] = None
    special_notes: Optional[str] = None


# ==================== AUTH HELPER ====================
@router.get("/")
async def list_properties(
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """List all properties for current client"""
    
    # Get client profile
    client = await db.client.find_first(where={"user_id": user["id"]})
    
    if not client:
        # Create client profile if doesn't exist
        client = await db.client.create(data={
            "user_id": user["id"],
            "display_name": user.get("full_name"),
        })
    
    properties = await db.properties.find_many(where={"client_id": client["id"]})
    return properties


@router.post("/")
async def create_property(
    data: CreatePropertyRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create a new property"""
    
    # Get or create client profile
    client = await db.client.find_first(where={"user_id": user["id"]})
    
    if not client:
        client = await db.client.create(data={
            "user_id": user["id"],
            "display_name": user.get("full_name"),
        })
    
    property_data = {
        "client_id": client["id"],
        "name": data.name or f"Property at {data.address[:30]}",
        "address": data.address,
        "address_line_2": data.address_line_2,
        "city": data.city,
        "state": data.state,
        "zip_code": data.zip_code,
        "country": data.country,
        "sqft": data.sqft or 1500,
        "bedrooms": data.bedrooms or 2,
        "bathrooms": data.bathrooms or 2.0,
        "property_type": data.property_type or "house",
        "airbnb_calendar_url": data.airbnb_calendar_url,
        "access_info": data.access_info,
        "special_notes": data.special_notes,
    }
    
    prop = await db.properties.create(data=property_data)
    
    return prop


@router.get("/{property_id}")
async def get_property(
    property_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get property details"""
    
    prop = await db.properties.find_unique(where={"id": property_id})
    
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Verify ownership
    client = await db.client.find_first(where={"user_id": user["id"]})
    if not client or prop.get("client_id") != client["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return prop


@router.patch("/{property_id}")
async def update_property(
    property_id: str,
    data: UpdatePropertyRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Update property"""
    
    # Verify ownership
    prop = await db.properties.find_unique(where={"id": property_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    client = await db.client.find_first(where={"user_id": user["id"]})
    if not client or prop.get("client_id") != client["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Build update data
    update_data = {}
    for field, value in data.model_dump().items():
        if value is not None:
            update_data[field] = value
    
    if not update_data:
        return prop
    
    updated = await db.properties.update(where={"id": property_id}, data=update_data)
    
    return updated


@router.delete("/{property_id}")
async def delete_property(
    property_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Delete property"""
    
    # Verify ownership
    prop = await db.properties.find_unique(where={"id": property_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    client = await db.client.find_first(where={"user_id": user["id"]})
    if not client or prop.get("client_id") != client["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.properties.delete(where={"id": property_id})
    
    if not result:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return {"message": "Property deleted"}


@router.post("/{property_id}/sync-calendar")
async def sync_airbnb_calendar(
    property_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Sync Airbnb calendar and create turnover jobs"""
    
    prop = await db.properties.find_unique(where={"id": property_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Verify ownership
    client = await db.client.find_first(where={"user_id": user["id"]})
    if not client or prop.get("client_id") != client["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not prop.get("airbnb_calendar_url"):
        raise HTTPException(status_code=400, detail="No Airbnb calendar URL configured")
    
    try:
        from app.services.ical import ical_service
        
        result = await ical_service.sync_property_calendar(
            property_id=property_id,
            calendar_url=prop["airbnb_calendar_url"],
            db=db
        )
        
        return {
            **result,
            "message": "Calendar synced successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Calendar sync failed: {e}")
        raise HTTPException(status_code=500, detail="Calendar sync failed")


# ==================== PLAYBOOK ====================

class PlaybookData(BaseModel):
    rooms: Optional[list] = None
    access_instructions: Optional[str] = None
    supplies_list: Optional[list] = None
    special_notes: Optional[str] = None
    do_not_touch: Optional[list] = None


@router.get("/{property_id}/playbook")
async def get_playbook(property_id: str, authorization: str = Header(None), db=Depends(get_db)):
    """Get property playbook (cleaning instructions)"""
    from app.api.v1.auth import decode_access_token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    user = await db.user.find_unique(where={"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    prop = await db.properties.find_unique(where={"id": property_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # Playbook stored in property notes as JSON
    import json
    try:
        playbook = json.loads(prop.get("notes") or "{}")
    except (json.JSONDecodeError, TypeError):
        playbook = {}

    return {"property_id": property_id, "playbook": playbook}


@router.post("/{property_id}/playbook")
async def save_playbook(property_id: str, data: PlaybookData, authorization: str = Header(None), db=Depends(get_db)):
    """Save property playbook (cleaning instructions)"""
    from app.api.v1.auth import decode_access_token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    user = await db.user.find_unique(where={"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    prop = await db.properties.find_unique(where={"id": property_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    import json
    playbook = data.dict(exclude_none=True)
    await db.properties.update(
        where={"id": property_id},
        data={"notes": json.dumps(playbook)}
    )

    return {"message": "Playbook saved", "playbook": playbook}

