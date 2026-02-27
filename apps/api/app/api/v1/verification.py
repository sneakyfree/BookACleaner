"""
Verification API endpoints for BookACleaner.ai
Implements 5-tier verification system for cleaners and clients
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Header
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List
import secrets
import logging

from app.database import get_db
from app.config import get_settings
from app.services.sms import sms_service

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


# ==================== SCHEMAS ====================

class VerificationStatusResponse(BaseModel):
    tier: int
    tier_name: str
    verifications: dict
    next_tier_requirements: List[dict]
    progress_percentage: int


class PhoneSendRequest(BaseModel):
    phone: str


class PhoneVerifyRequest(BaseModel):
    code: str


class UploadResponse(BaseModel):
    id: str
    status: str
    message: str


# ==================== TIER CALCULATION ====================

TIER_NAMES = {
    1: "Starter",
    2: "Verified", 
    3: "Professional",
    4: "Certified",
    5: "Elite"
}

TIER_REQUIREMENTS = {
    1: ["email"],  # Tier 1: Email verified
    2: ["email", "phone", "id"],  # Tier 2: + Phone + ID
    3: ["email", "phone", "id", "business_license", "insurance"],  # Tier 3: + Business + Insurance
    4: ["email", "phone", "id", "business_license", "insurance", "certification"],  # Tier 4: + Certification
    5: ["email", "phone", "id", "business_license", "insurance", "certification", "background_check"]  # Tier 5: + Background
}


def calculate_tier(verifications: dict, is_email_verified: bool = False, is_phone_verified: bool = False) -> int:
    """Calculate verification tier based on completed verifications"""
    verified_types = set()
    
    # Check base verifications
    if is_email_verified:
        verified_types.add("email")
    if is_phone_verified:
        verified_types.add("phone")
    
    # Check document verifications
    for v in verifications:
        if v.get("status") == "verified":
            verified_types.add(v.get("type", "").lower())
    
    # Determine tier
    current_tier = 1
    for tier in range(5, 0, -1):
        required = set(TIER_REQUIREMENTS[tier])
        if required.issubset(verified_types):
            current_tier = tier
            break
    
    return current_tier


def get_next_tier_requirements(current_tier: int, verifications: dict, is_email_verified: bool, is_phone_verified: bool) -> List[dict]:
    """Get requirements for next tier"""
    if current_tier >= 5:
        return []
    
    next_tier = current_tier + 1
    required = TIER_REQUIREMENTS[next_tier]
    
    verified_types = set()
    if is_email_verified:
        verified_types.add("email")
    if is_phone_verified:
        verified_types.add("phone")
    for v in verifications:
        if v.get("status") == "verified":
            verified_types.add(v.get("type", "").lower())
    
    requirements = []
    for req in required:
        if req not in verified_types:
            requirements.append({
                "type": req,
                "label": req.replace("_", " ").title(),
                "completed": False,
                "action": f"upload_{req}" if req not in ["email", "phone"] else f"verify_{req}"
            })
    
    return requirements


# ==================== HELPER: GET USER FROM TOKEN ====================

async def get_current_user(authorization: str = Header(None), db = Depends(get_db)):
    """Get current user from Bearer token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
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
    
    return user


# ==================== ENDPOINTS ====================

@router.get("/status", response_model=VerificationStatusResponse)
async def get_verification_status(
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get current verification status and tier"""
    
    # Get all verifications for user
    verifications = await db.verification.find_many(where={"user_id": user["id"]})
    
    # Check email/phone verified
    is_email_verified = bool(user.get("email_verified_at") or user.get("is_verified"))
    is_phone_verified = bool(user.get("phone_verified_at"))
    
    # Calculate tier
    tier = calculate_tier(verifications, is_email_verified, is_phone_verified)
    
    # Build verification status dict
    verification_status = {}
    if is_email_verified:
        verification_status["email"] = {"status": "verified", "verified_at": user.get("email_verified_at")}
    if is_phone_verified:
        verification_status["phone"] = {"status": "verified", "verified_at": user.get("phone_verified_at")}
    
    for v in verifications:
        verification_status[v["type"]] = {
            "status": v["status"],
            "verified_at": v.get("verified_at"),
            "expires_at": v.get("expires_at"),
        }
    
    # Get next tier requirements
    next_requirements = get_next_tier_requirements(tier, verifications, is_email_verified, is_phone_verified)
    
    # Calculate progress
    total_possible = len(TIER_REQUIREMENTS[5])
    completed = len([v for v in verification_status.values() if v.get("status") == "verified"])
    progress = int((completed / total_possible) * 100)
    
    return VerificationStatusResponse(
        tier=tier,
        tier_name=TIER_NAMES[tier],
        verifications=verification_status,
        next_tier_requirements=next_requirements,
        progress_percentage=progress
    )


@router.post("/phone/send")
async def send_phone_verification(
    data: PhoneSendRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Send phone verification SMS"""
    
    # Generate 6-digit code
    code = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Store in database
    await db.phone_verification.create(
        data={
            "user_id": user["id"],
            "phone": data.phone,
            "code": code,
            "expires_at": expires_at,
        }
    )
    
    # Send SMS (if Twilio is configured)
    try:
        await sms_service.send_verification_code(data.phone, code)
    except Exception as e:
        logger.warning(f"Failed to send SMS (Twilio may not be configured): {e}")
        # In dev mode, log the code
        logger.info(f"DEV MODE - Verification code for {data.phone}: {code}")
    
    return {"message": "Verification code sent", "expires_in": 600}


@router.post("/phone/verify")
async def verify_phone(
    data: PhoneVerifyRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Verify phone with code"""
    
    # Find latest verification for user
    verifications = await db.phone_verification.find_many(where={"user_id": user["id"]})
    
    if not verifications:
        raise HTTPException(status_code=400, detail="No verification in progress")
    
    # Get most recent (they're returned in order)
    latest = verifications[-1]
    
    # Check if already verified
    if latest.get("verified_at"):
        raise HTTPException(status_code=400, detail="Already verified")
    
    # Check expiration
    expires_at = latest.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    
    if expires_at and expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code expired")
    
    # Check code
    if latest["code"] != data.code:
        raise HTTPException(status_code=400, detail="Invalid code")
    
    # Update user
    await db.user.update(
        where={"id": user["id"]},
        data={
            "phone": latest["phone"],
            "phone_verified_at": datetime.utcnow()
        }
    )
    
    # Mark verification as used
    await db.phone_verification.update(
        where={"id": latest["id"]},
        data={"verified_at": datetime.utcnow()}
    )
    
    # Create verification record
    await db.verification.create(
        data={
            "user_id": user["id"],
            "type": "phone",
            "status": "verified",
            "verified_at": datetime.utcnow()
        }
    )
    
    return {"message": "Phone verified successfully"}


@router.post("/upload/{verification_type}", response_model=UploadResponse)
async def upload_verification_document(
    verification_type: str,
    user = Depends(get_current_user),
    db = Depends(get_db),
    file: UploadFile = File(None)
):
    """Upload a verification document"""
    
    valid_types = ["id", "business_license", "insurance", "certification", "background_check"]
    if verification_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid verification type. Must be one of: {valid_types}")
    
    # In production, upload to S3
    # For now, create verification record as pending
    document_url = f"uploads/{user['id']}/{verification_type}_{datetime.utcnow().timestamp()}"
    
    verification = await db.verification.create(
        data={
            "user_id": user["id"],
            "type": verification_type,
            "status": "pending",
            "document_url": document_url,
        }
    )
    
    return UploadResponse(
        id=verification["id"],
        status="pending",
        message=f"{verification_type.replace('_', ' ').title()} uploaded. Review typically takes 24-48 hours."
    )


@router.get("/types")
async def get_verification_types():
    """Get available verification types and their descriptions"""
    return {
        "types": [
            {"key": "email", "name": "Email", "description": "Verify your email address", "tier": 1},
            {"key": "phone", "name": "Phone", "description": "Verify your phone number via SMS", "tier": 2},
            {"key": "id", "name": "Government ID", "description": "Upload a valid government-issued ID", "tier": 2},
            {"key": "business_license", "name": "Business License", "description": "Upload your business license or registration", "tier": 3},
            {"key": "insurance", "name": "Insurance", "description": "Upload proof of liability insurance", "tier": 3},
            {"key": "certification", "name": "Industry Certification", "description": "IICRC, EPA, or other industry certifications", "tier": 4},
            {"key": "background_check", "name": "Background Check", "description": "Complete a background check verification", "tier": 5},
        ],
        "tiers": [
            {"level": 1, "name": "Starter", "badge_color": "#6b7280"},
            {"level": 2, "name": "Verified", "badge_color": "#3b82f6"},
            {"level": 3, "name": "Professional", "badge_color": "#10b981"},
            {"level": 4, "name": "Certified", "badge_color": "#f59e0b"},
            {"level": 5, "name": "Elite", "badge_color": "#8b5cf6"},
        ]
    }


@router.get("/badges/{user_id}")
async def get_user_badges(
    user_id: str,
    db = Depends(get_db)
):
    """Get earned badges for a user (public endpoint)"""
    from app.services.badge_engine import badge_engine

    badges = await badge_engine.get_user_badges(user_id, db)
    return {"badges": badges, "count": len(badges)}


@router.post("/badges/evaluate")
async def trigger_badge_evaluation(
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Manually trigger badge evaluation for current user"""
    from app.services.badge_engine import badge_engine

    awarded = await badge_engine.evaluate_user(user["id"], db)
    return {"awarded": awarded, "count": len(awarded)}

