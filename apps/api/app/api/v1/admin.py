"""
Admin API for BookACleaner.ai
Platform management and statistics
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import logging

from app.database import get_db
from app.config import get_settings

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


# ==================== AUTH HELPER ====================

async def get_admin_user(authorization: str = Header(None), db = Depends(get_db)):
    """Get current admin user from Bearer token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    from jose import jwt, JWTError
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user


# ==================== ENDPOINTS ====================

@router.get("/stats")
async def get_platform_stats(
    admin = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Get platform-wide statistics"""
    
    # Count users
    all_users = await db.user.find_many()
    total_users = len(all_users)
    cleaners_count = sum(1 for u in all_users if u.get("role") == "cleaner")
    clients_count = sum(1 for u in all_users if u.get("role") == "client")
    
    # Count jobs
    all_jobs = await db.job.find_many()
    total_jobs = len(all_jobs)
    pending_jobs = sum(1 for j in all_jobs if j.get("status") == "pending")
    completed_jobs = sum(1 for j in all_jobs if j.get("status") == "completed")
    
    # Calculate revenue (sum of completed job prices)
    total_revenue = sum(j.get("total_price", 0) or 0 for j in all_jobs if j.get("status") == "completed")
    
    # Count pending verifications
    all_verifications = await db.verification.find_many()
    pending_verifications = sum(1 for v in all_verifications if v.get("status") == "pending")
    
    # Weekly new users (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    new_users_this_week = sum(1 for u in all_users if u.get("created_at") and datetime.fromisoformat(str(u["created_at"]).replace("Z", "+00:00").replace("+00:00", "")) > week_ago)
    
    return {
        "users": {
            "total": total_users,
            "cleaners": cleaners_count,
            "clients": clients_count,
            "new_this_week": new_users_this_week,
        },
        "jobs": {
            "total": total_jobs,
            "pending": pending_jobs,
            "completed": completed_jobs,
            "completion_rate": round(completed_jobs / total_jobs * 100, 1) if total_jobs > 0 else 0,
        },
        "revenue": {
            "total": round(total_revenue, 2),
            "platform_fee": round(total_revenue * 0.15, 2),  # 15% platform fee
        },
        "verifications": {
            "pending": pending_verifications,
        }
    }


@router.get("/users")
async def list_users(
    role: Optional[str] = Query(None),
    verified: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin = Depends(get_admin_user),
    db = Depends(get_db)
):
    """List all users with filters"""
    
    where = {}
    if role:
        where["role"] = role
    
    users = await db.user.find_many(where=where if where else None)
    
    # Filter by verified if specified
    if verified is not None:
        users = [u for u in users if u.get("is_verified") == verified]
    
    # Paginate
    start = (page - 1) * limit
    end = start + limit
    paginated = users[start:end]
    
    # Remove sensitive data
    safe_users = []
    for u in paginated:
        safe_users.append({
            "id": u["id"],
            "email": u["email"],
            "role": u["role"],
            "full_name": u.get("full_name"),
            "is_verified": u.get("is_verified"),
            "created_at": u.get("created_at"),
        })
    
    return {
        "users": safe_users,
        "total": len(users),
        "page": page,
        "limit": limit,
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    admin = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Get detailed user information"""
    
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get verifications
    verifications = await db.verification.find_many(where={"user_id": user_id})
    
    # Get profile based on role
    profile = None
    if user["role"] == "cleaner":
        profile = await db.cleaner.find_first(where={"user_id": user_id})
    elif user["role"] == "client":
        profile = await db.client.find_first(where={"user_id": user_id})
    
    # Get jobs
    jobs = []
    if profile:
        if user["role"] == "cleaner":
            jobs = await db.job.find_many(where={"cleaner_id": profile["id"]})
        else:
            jobs = await db.job.find_many(where={"client_id": profile["id"]})
    
    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "full_name": user.get("full_name"),
            "phone": user.get("phone"),
            "is_verified": user.get("is_verified"),
            "email_verified_at": user.get("email_verified_at"),
            "phone_verified_at": user.get("phone_verified_at"),
            "created_at": user.get("created_at"),
        },
        "profile": profile,
        "verifications": verifications,
        "jobs_count": len(jobs),
    }


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    is_verified: Optional[bool] = None,
    role: Optional[str] = None,
    admin = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Update user (admin actions)"""
    
    update_data = {}
    if is_verified is not None:
        update_data["is_verified"] = is_verified
    if role is not None:
        if role not in ["client", "cleaner", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        update_data["role"] = role
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    user = await db.user.update(where={"id": user_id}, data=update_data)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"updated": True, "user_id": user_id}


@router.get("/verifications/queue")
async def get_verification_queue(
    status: str = Query("pending"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Get verification review queue"""
    
    verifications = await db.verification.find_many(where={"status": status})
    
    # Paginate
    start = (page - 1) * limit
    end = start + limit
    paginated = verifications[start:end]
    
    # Enrich with user data
    enriched = []
    for v in paginated:
        user = await db.user.find_unique(where={"id": v["user_id"]})
        enriched.append({
            **v,
            "user": {
                "id": user["id"] if user else None,
                "email": user.get("email") if user else None,
                "full_name": user.get("full_name") if user else None,
            } if user else None
        })
    
    return {
        "verifications": enriched,
        "total": len(verifications),
        "page": page,
        "limit": limit,
    }


@router.post("/verifications/{verification_id}/approve")
async def approve_verification(
    verification_id: str,
    admin = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Approve a verification document"""
    
    verification = await db.verification.update(
        where={"id": verification_id},
        data={
            "status": "verified",
            "verified_at": datetime.utcnow(),
        }
    )
    
    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")
    
    return {"approved": True, "verification_id": verification_id}


@router.post("/verifications/{verification_id}/reject")
async def reject_verification(
    verification_id: str,
    reason: str = "Document not acceptable",
    admin = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Reject a verification document"""
    
    verification = await db.verification.update(
        where={"id": verification_id},
        data={
            "status": "rejected",
            "rejection_reason": reason,
        }
    )
    
    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")
    
    return {"rejected": True, "verification_id": verification_id, "reason": reason}


@router.get("/jobs")
async def list_all_jobs(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin = Depends(get_admin_user),
    db = Depends(get_db)
):
    """List all jobs (admin view)"""
    
    where = {}
    if status:
        where["status"] = status
    
    jobs = await db.job.find_many(where=where if where else None)
    
    # Paginate
    start = (page - 1) * limit
    end = start + limit
    
    return {
        "jobs": jobs[start:end],
        "total": len(jobs),
        "page": page,
        "limit": limit,
    }
