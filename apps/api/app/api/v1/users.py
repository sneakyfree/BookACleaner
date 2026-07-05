"""
Users API for BookACleaner.ai
Provides user profile management endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging

from app.database import get_db
from app.api.deps import get_current_user, get_admin_user

router = APIRouter()
logger = logging.getLogger(__name__)


# ==================== SCHEMAS ====================

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


# ==================== ENDPOINTS ====================

@router.get("/me")
async def get_my_profile(
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Get the current user's profile"""
    profile_data = {"user": user}

    # Attach role-specific profile
    if user.get("role") == "cleaner":
        cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
        if cleaner:
            profile_data["cleaner_profile"] = cleaner
    elif user.get("role") == "client":
        client = await db.client.find_first(where={"user_id": user["id"]})
        if client:
            profile_data["client_profile"] = client

    return profile_data


@router.get("/me/notifications")
async def get_my_notification_prefs(user=Depends(get_current_user)):
    """Notification preferences for the current user.

    Returns sensible defaults (channel + per-event toggles) so the settings UI
    has a baseline; persistence can be layered on later without changing the
    response shape.
    """
    return {
        "bookingConfirmations": True,
        "cleaningReminders": True,
        "reviewRequests": True,
        "promotions": False,
        "smsEnabled": True,
        "emailEnabled": True,
    }


@router.patch("/me")
async def update_my_profile(
    data: UpdateProfileRequest,
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Update the current user's profile"""
    update_data = {}
    if data.full_name is not None:
        update_data["full_name"] = data.full_name
    if data.phone is not None:
        update_data["phone"] = data.phone
    if data.avatar_url is not None:
        update_data["avatar_url"] = data.avatar_url

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Pass a datetime object, not an ISO string: the ORM DateTime column is
    # written via setattr, and SQLite rejects strings ("only accepts Python
    # datetime and date objects") — this 500'd every profile update.
    update_data["updated_at"] = datetime.now(timezone.utc)
    updated = await db.user.update(where={"id": user["id"]}, data=update_data)

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update profile")

    return {"success": True, "user": updated}


@router.get("/")
async def list_users(
    user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """List all users (admin only)"""
    users = await db.user.find_many()
    return {"users": users, "total": len(users)}


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Get user by ID"""
    target = await db.user.find_unique(where={"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Redact sensitive fields for non-admin users
    if user.get("role") != "admin" and user.get("id") != user_id:
        target.pop("password_hash", None)
        target.pop("refresh_token", None)
        target.pop("email", None)

    return target
