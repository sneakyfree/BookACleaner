"""
Shared dependencies for BookACleaner.ai API routes.
Provides canonical auth helpers to avoid duplication across route files.
"""
from fastapi import HTTPException, Depends, Header
from app.database import get_db
from app.config import get_settings

settings = get_settings()


async def get_current_user(authorization: str = Header(None), db=Depends(get_db)):
    """Get current user from Bearer token.
    
    Canonical implementation — import this instead of pasting
    a local copy into each route file.
    """
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

    # A suspended/banned account is denied immediately on every request — not
    # only at login/refresh — so moderation takes effect within the access
    # token's lifetime instead of lagging up to 15 minutes.
    if user.get("status") in ("banned", "suspended"):
        raise HTTPException(status_code=403, detail=f"Account is {user.get('status')}.")

    # Reject tokens minted before a session revocation (force-logout, ban,
    # password reset). Missing claim == version 0 for backward compatibility.
    if int(payload.get("tv", 0)) != int(user.get("token_version", 0) or 0):
        raise HTTPException(status_code=401, detail="Session revoked. Please log in again.")

    return user


async def get_admin_user(user=Depends(get_current_user)):
    """Require admin role."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def get_cleaner_user(user=Depends(get_current_user)):
    """Require cleaner role."""
    if user.get("role") != "cleaner":
        raise HTTPException(status_code=403, detail="Cleaner access required")
    return user


async def get_client_user(user=Depends(get_current_user)):
    """Require client role."""
    if user.get("role") != "client":
        raise HTTPException(status_code=403, detail="Client access required")
    return user
