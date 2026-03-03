from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, EmailStr, Field, field_validator
import bcrypt
from datetime import datetime, timedelta
from jose import jwt, JWTError
import secrets
import re
import logging

from app.database import get_db
from app.config import get_settings
from app.services.email import email_service

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str  # 'client' or 'cleaner'

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        return v


class VerifyEmailRequest(BaseModel):
    token: str


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Decode and validate JWT access token"""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None


async def get_current_user_from_token(token: str, db):
    """Get user from JWT token"""
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return await db.user.find_unique(where={"id": user_id})


@router.post("/register", response_model=TokenResponse)
async def register(data: RegisterRequest, db = Depends(get_db)):
    """Register a new user"""
    
    # Check if user exists
    existing = await db.user.find_unique(where={"email": data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate role
    if data.role not in ["client", "cleaner"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'client' or 'cleaner'"
        )
    
    # Hash password
    password_hash = hash_password(data.password)
    
    # Create user
    user = await db.user.create(
        data={
            "email": data.email,
            "password_hash": password_hash,
            "role": data.role,
            "full_name": data.email.split("@")[0],
            "is_verified": False,
        }
    )
    
    # Create email verification token
    verification_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=24)
    
    await db.email_verification.create(
        data={
            "user_id": user["id"],
            "token": verification_token,
            "expires_at": expires_at,
        }
    )
    
    # Send verification email (non-blocking, don't fail registration if email fails)
    try:
        verify_link = f"{settings.frontend_url}/verify-email?token={verification_token}"
        await email_service.send_verification_email(
            to_email=data.email,
            name=user["full_name"],
            verify_link=verify_link
        )
    except Exception as e:
        logger.warning(f"Failed to send verification email: {e}")
    
    # Create access token
    access_token = create_access_token({"sub": user["id"], "role": user["role"]})
    
    return TokenResponse(
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes * 60,
        user={
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "is_verified": user["is_verified"],
        }
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db = Depends(get_db)):
    """Login with email and password"""
    
    # Find user
    user = await db.user.find_unique(where={"email": data.email})
    if not user or not user.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token({"sub": user["id"], "role": user["role"]})
    
    return TokenResponse(
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes * 60,
        user={
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "is_verified": user.get("is_verified", False),
        }
    )


class RefreshTokenRequest(BaseModel):
    access_token: str


@router.post("/refresh")
async def refresh_token(data: RefreshTokenRequest, db = Depends(get_db)):
    """Refresh an access token. Accepts a (possibly expired) access token and
    returns a new one if the underlying user is still valid.
    Max token age for refresh: 7 days."""
    try:
        # Decode token, allowing expired tokens so refresh works even if slightly past expiry
        payload = jwt.decode(
            data.access_token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": False},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # Enforce max token age (7 days) — prevent infinite refresh of ancient tokens
    issued_at = payload.get("exp")
    if issued_at:
        token_expiry = datetime.utcfromtimestamp(issued_at)
        max_refresh_window = timedelta(days=settings.refresh_token_expire_days)
        if datetime.utcnow() - token_expiry > max_refresh_window:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token too old to refresh. Please log in again.",
            )

    # Verify user still exists and is active
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Check if user is banned/suspended
    user_status = user.get("status", "active")
    if user_status in ("banned", "suspended"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user_status}. Contact support.",
        )

    # Issue fresh access token
    new_access_token = create_access_token({"sub": user["id"], "role": user["role"]})

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
        },
    }


@router.post("/verify-email")
async def verify_email(data: VerifyEmailRequest, db = Depends(get_db)):
    """Verify email with token"""
    
    # Find verification record
    verification = await db.email_verification.find_unique(where={"token": data.token})
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Check if already verified
    if verification.get("verified_at"):
        return {"message": "Email already verified"}
    
    # Check expiration
    expires_at = verification.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    
    if expires_at and expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired"
        )
    
    # Update user as verified
    await db.user.update(
        where={"id": verification["user_id"]},
        data={
            "is_verified": True,
            "email_verified_at": datetime.utcnow()
        }
    )
    
    # Mark verification as used
    await db.email_verification.update(
        where={"id": verification["id"]},
        data={"verified_at": datetime.utcnow()}
    )
    
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
async def resend_verification(email: EmailStr, db = Depends(get_db)):
    """Resend verification email"""
    
    user = await db.user.find_unique(where={"email": email})
    
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a verification email will be sent"}
    
    if user.get("is_verified"):
        return {"message": "Email already verified"}
    
    # Create new verification token
    verification_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=24)
    
    await db.email_verification.create(
        data={
            "user_id": user["id"],
            "token": verification_token,
            "expires_at": expires_at,
        }
    )
    
    # Send verification email
    try:
        verify_link = f"{settings.frontend_url}/verify-email?token={verification_token}"
        await email_service.send_verification_email(
            to_email=email,
            name=user.get("full_name", "User"),
            verify_link=verify_link
        )
    except Exception as e:
        logger.warning(f"Failed to send verification email: {e}")
    
    return {"message": "If the email exists, a verification email will be sent"}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db = Depends(get_db)):
    """Request password reset"""
    
    user = await db.user.find_unique(where={"email": data.email})
    
    if user:
        # Generate reset token
        token = secrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(hours=1)
        
        # Store token
        await db.password_reset.create(
            data={
                "user_id": user["id"],
                "token": token,
                "expires_at": expires,
            }
        )
        
        # Send email
        try:
            reset_link = f"{settings.frontend_url}/reset-password?token={token}"
            await email_service.send_password_reset(data.email, reset_link)
        except Exception as e:
            logger.warning(f"Failed to send password reset email: {e}")
    
    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db = Depends(get_db)):
    """Reset password with token"""
    
    # Find reset record
    reset = await db.password_reset.find_unique(where={"token": data.token})
    
    if not reset:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Check if already used
    if reset.get("used_at"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has already been used"
        )
    
    # Check expiration
    expires_at = reset.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    
    if expires_at and expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
    
    # Hash new password
    password_hash = hash_password(data.password)
    
    # Update user password
    await db.user.update(
        where={"id": reset["user_id"]},
        data={"password_hash": password_hash}
    )
    
    # Mark token as used
    await db.password_reset.update(
        where={"id": reset["id"]},
        data={"used_at": datetime.utcnow()}
    )
    
    return {"message": "Password reset successfully"}


@router.get("/me")
async def get_current_user(authorization: str = Header(None), db = Depends(get_db)):
    """Get current authenticated user"""
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    token = authorization.replace("Bearer ", "")
    user = await get_current_user_from_token(token, db)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "full_name": user.get("full_name"),
        "is_verified": user.get("is_verified", False),
    }


class OAuthGoogleRequest(BaseModel):
    email: EmailStr
    name: str | None = None
    image: str | None = None


@router.post("/oauth/google", response_model=TokenResponse)
async def oauth_google(data: OAuthGoogleRequest, db = Depends(get_db)):
    """Handle Google OAuth callback from NextAuth.
    
    SECURITY NOTE: This endpoint trusts NextAuth to have verified the Google
    ID token. In production, the NextAuth server-side callback verifies the
    Google JWT, and only then calls this endpoint. Direct calls to this 
    endpoint should be restricted to the NextAuth server via CORS and a 
    shared secret.
    """
    
    if not data.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )
    
    # Check if user exists
    user = await db.user.find_unique(where={"email": data.email})
    
    if not user:
        # Create new user from Google OAuth
        user = await db.user.create(
            data={
                "email": data.email,
                "password_hash": None,  # OAuth users don't have password
                "role": "client",  # Default to client role
                "full_name": data.name or data.email.split("@")[0],
                "avatar_url": data.image,
                "is_verified": True,  # OAuth users are verified
                "email_verified_at": datetime.utcnow(),
            }
        )
    
    # Check if user is banned/suspended
    user_status = user.get("status", "active")
    if user_status in ("banned", "suspended"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user_status}. Contact support."
        )
    
    # Create access token
    access_token = create_access_token({"sub": user["id"], "role": user["role"]})
    
    return TokenResponse(
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes * 60,
        user={
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "is_verified": user.get("is_verified", True),
        }
    )
