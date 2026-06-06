"""
Content Moderation API for BookACleaner.ai
Handles flagging, review, and removal of content.
Closes gaps F-ADM-3 from implementation plan.
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging

from app.database import get_db
from app.core.audit import record_audit
from app.config import get_settings
from app.api.deps import get_current_user

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


class FlagContentRequest(BaseModel):
    content_type: str  # review, message, feed
    content_id: str
    reason: str  # spam, inappropriate, harassment, fraud, other
    details: Optional[str] = None
async def get_admin_user(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.post("/flag")
async def flag_content(data: FlagContentRequest, user=Depends(get_current_user), db=Depends(get_db)):
    """Flag content for moderation review."""
    from app.models import generate_uuid
    flag_id = generate_uuid()
    await db.execute(
        """INSERT INTO flagged_content (id, content_type, content_id, flagged_by, reason, details, status, created_at)
           VALUES (:id, :ctype, :cid, :uid, :reason, :details, 'pending', :now)""",
        {"id": flag_id, "ctype": data.content_type, "cid": data.content_id,
         "uid": user["id"], "reason": data.reason, "details": data.details,
         "now": datetime.now(timezone.utc)}
    )
    logger.info(f"Content flagged: {data.content_type}/{data.content_id} by {user['id']}")
    return {"id": flag_id, "status": "pending", "message": "Content flagged for review"}


@router.get("/flagged")
async def list_flagged_content(
    status: Optional[str] = Query("pending"),
    content_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """List flagged content (admin only)."""
    conditions = []
    params = {"limit": limit, "offset": (page - 1) * limit}
    if status:
        conditions.append("fc.status = :status")
        params["status"] = status
    if content_type:
        conditions.append("fc.content_type = :ctype")
        params["ctype"] = content_type

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    items = await db.execute(
        f"SELECT fc.*, u.full_name as flagged_by_name "
        f"FROM flagged_content fc LEFT JOIN users u ON fc.flagged_by = u.id "
        f"{where} ORDER BY fc.created_at DESC LIMIT :limit OFFSET :offset",
        params
    )
    return {"items": items or [], "page": page}


@router.post("/flagged/{flag_id}/review")
async def review_flagged_content(
    flag_id: str,
    action: str,  # dismiss, remove
    user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Review flagged content — dismiss or remove (admin only)."""
    now = datetime.now(timezone.utc)
    new_status = "dismissed" if action == "dismiss" else "removed"
    await db.execute(
        "UPDATE flagged_content SET status = :status, reviewed_by = :admin, reviewed_at = :now WHERE id = :id",
        {"status": new_status, "admin": user["id"], "now": now, "id": flag_id}
    )

    if action == "remove":
        flag = await db.execute("SELECT * FROM flagged_content WHERE id = :id", {"id": flag_id})
        if flag:
            f = flag[0] if isinstance(flag, list) else flag
            if f.get("content_type") == "review":
                await db.execute("UPDATE reviews SET is_public = 0 WHERE id = :id", {"id": f["content_id"]})
            elif f.get("content_type") == "feed":
                await db.execute("DELETE FROM feed_items WHERE id = :id", {"id": f["content_id"]})
            logger.info(f"Content removed: {f.get('content_type')}/{f.get('content_id')}")

    await record_audit(
        db,
        event_type="content.removed" if action == "remove" else "content.dismissed",
        actor=user, target=flag_id, details=f"Flagged content {new_status}",
    )
    return {"status": new_status, "action": action}
