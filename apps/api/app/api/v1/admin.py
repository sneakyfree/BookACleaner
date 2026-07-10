"""
Admin API for BookACleaner.ai
Platform management and statistics
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import logging
import secrets
import csv
import io

from app.database import get_db
from app.config import get_settings
from app.api.deps import get_admin_user
from app.core.audit import record_audit, audit_health
from app.core import totp

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


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
    # Stored timestamps may be naive (SQLite) or aware (Postgres). Normalize to
    # aware-UTC before comparing, otherwise "can't compare offset-naive and
    # offset-aware datetimes" 500s the whole admin dashboard.
    def _as_aware_utc(value):
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_users_this_week = sum(
        1 for u in all_users
        if u.get("created_at") and _as_aware_utc(u["created_at"]) > week_ago
    )
    
    # Celery task schedule
    try:
        from app.worker import celery_app
        beat_schedule = celery_app.conf.beat_schedule or {}
        scheduled_tasks = [
            {"name": name, "schedule": str(cfg.get("schedule", "N/A")), "task": cfg.get("task", name)}
            for name, cfg in beat_schedule.items()
        ]
    except Exception:
        scheduled_tasks = []

    # Cache status
    try:
        from app.cache import cache as cache_instance
        cache_connected = cache_instance._client is not None
    except Exception:
        cache_connected = False

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
        },
        "background_tasks": {
            "scheduled": scheduled_tasks,
            "cache_connected": cache_connected,
        },
    }


@router.get("/users")
async def list_users(
    role: Optional[str] = Query(None),
    verified: Optional[bool] = Query(None),
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Search email / name / phone"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin = Depends(get_admin_user),
    db = Depends(get_db)
):
    """List users with server-side search + filters.

    `q` matches email, full name, or phone (case-insensitive substring) across
    the whole user base — so an admin can actually locate one account among
    thousands rather than only filtering the current page in the browser.
    """

    where = {}
    if role:
        where["role"] = role

    users = await db.user.find_many(where=where if where else None)

    if verified is not None:
        users = [u for u in users if u.get("is_verified") == verified]
    if status:
        users = [u for u in users if (u.get("status") or "active") == status]
    if q:
        needle = q.strip().lower()
        users = [
            u for u in users
            if needle in (u.get("email") or "").lower()
            or needle in (u.get("full_name") or "").lower()
            or needle in (u.get("phone") or "").lower()
        ]

    # Newest first so the list is stable and useful.
    users.sort(key=lambda u: str(u.get("created_at") or ""), reverse=True)

    # Paginate (real total reflects the filtered set)
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
            "status": u.get("status") or "active",
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

    # Audit PII reads (not just writes) — a "who looked at this customer's data"
    # trail for compliance.
    await record_audit(db, event_type="user.viewed", actor=admin,
                       target=user_id, details=f"Admin viewed PII for {user.get('email')}")

    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "full_name": user.get("full_name"),
            "phone": user.get("phone"),
            "status": user.get("status") or "active",
            "is_verified": user.get("is_verified"),
            "mfa_enabled": bool(user.get("mfa_enabled")),
            "email_verified_at": user.get("email_verified_at"),
            "phone_verified_at": user.get("phone_verified_at"),
            "created_at": user.get("created_at"),
        },
        "profile": profile,
        "verifications": verifications,
        "jobs_count": len(jobs),
    }


class UpdateUserRequest(BaseModel):
    """Admin user-moderation payload (JSON body).

    The frontend admin users page sends these as a JSON body, not query
    params. `status` drives suspend/ban/reactivate; `role` re-assigns role;
    `is_verified` toggles the verification badge. `confirm_grant_admin` must be
    set true to promote an account to admin (guards accidental escalation).
    """
    status: Optional[str] = None
    role: Optional[str] = None
    is_verified: Optional[bool] = None
    confirm_grant_admin: Optional[bool] = None


async def _active_admin_count(db) -> int:
    """Number of admins who can still log in (role=admin and not disabled)."""
    admins = await db.user.find_many(where={"role": "admin"}) or []
    return sum(1 for a in admins if (a.get("status") or "active") == "active")


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    payload: UpdateUserRequest,
    admin = Depends(get_admin_user),
    db = Depends(get_db)
):
    """Update user (admin actions): suspend/ban/reactivate, change role, verify.

    Governance guardrails prevent the admin tier from being used to lock the
    platform out of itself or to silently escalate privilege:
      * you cannot suspend/ban or de-admin your own account;
      * you cannot disable or demote the last remaining active admin;
      * promoting an account to admin requires explicit confirmation.
    """
    target = await db.user.find_unique(where={"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target_role = target.get("role")
    new_role = payload.role
    new_status = payload.status
    is_self = user_id == admin.get("id")

    demoting_admin = target_role == "admin" and new_role is not None and new_role != "admin"
    disabling = new_status in ("suspended", "banned")
    granting_admin = new_role == "admin" and target_role != "admin"

    # Self-lockout protection
    if is_self and disabling:
        raise HTTPException(status_code=403, detail="You cannot suspend or ban your own admin account")
    if is_self and demoting_admin:
        raise HTTPException(status_code=403, detail="You cannot remove your own admin role")

    # Grant-admin requires explicit confirmation
    if granting_admin and not payload.confirm_grant_admin:
        raise HTTPException(
            status_code=400,
            detail="Granting admin requires confirm_grant_admin=true",
        )

    # Last-admin protection — never leave the platform with zero usable admins
    if (demoting_admin or (target_role == "admin" and disabling)) and await _active_admin_count(db) <= 1:
        raise HTTPException(status_code=403, detail="Cannot disable or demote the last active admin")

    update_data = {}
    if payload.is_verified is not None:
        update_data["is_verified"] = payload.is_verified
    if new_role is not None:
        if new_role not in ["client", "cleaner", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        update_data["role"] = new_role
    if new_status is not None:
        if new_status not in ["active", "suspended", "banned"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        update_data["status"] = new_status

    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")

    # Revoke outstanding sessions when we suspend/ban or change role, so the
    # action takes effect immediately rather than lasting until token expiry.
    if disabling or (new_role is not None and new_role != target_role):
        update_data["token_version"] = int(target.get("token_version", 0) or 0) + 1

    user = await db.user.update(where={"id": user_id}, data=update_data)

    await record_audit(db, event_type="user.updated", actor=admin,
                       target=user_id, details=f"Admin updated user: {update_data}")
    return {"updated": True, "user_id": user_id, "status": user.get("status"),
            "role": user.get("role"), "is_verified": user.get("is_verified")}


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
            "user_name": user.get("full_name") if user else None,
            "user_email": user.get("email") if user else None,
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
            "verified_at": datetime.now(timezone.utc),
        }
    )
    
    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")

    await record_audit(db, event_type="verification.approved", actor=admin,
                       target=verification_id, details="Verification document approved")
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

    await record_audit(db, event_type="verification.rejected", actor=admin,
                       target=verification_id, details=f"Rejected: {reason}")
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


@router.get("/audit")
async def get_audit_log(
    action: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    admin = Depends(get_admin_user),
    db = Depends(get_db),
):
    """Admin audit trail, most recent first. `action` filters by event-type prefix."""
    logs = await db.audit_log.find_many() or []
    if action:
        logs = [l for l in logs if (l.get("event_type") or "").startswith(action)]
    logs.sort(key=lambda l: str(l.get("created_at") or ""), reverse=True)
    total = len(logs)
    start = (page - 1) * limit
    # `audit` health lets the UI warn when writes are failing (e.g. missing
    # table) instead of showing an empty trail as if nothing has happened.
    return {"items": logs[start:start + limit], "total": total, "page": page,
            "audit": audit_health()}


# ==================== ANALYTICS TIME-SERIES ====================

def _parse_dt_aware(value):
    """Parse a stored timestamp to aware-UTC, or None."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


_RANGE_DAYS = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}


@router.get("/analytics/timeseries")
async def analytics_timeseries(
    range_: str = Query("30d", alias="range"),
    admin = Depends(get_admin_user),
    db = Depends(get_db),
):
    """Daily signups / jobs / revenue over the requested window, plus
    period-over-period deltas — the data the analytics dashboard needs to show
    real trends instead of hard-coded zeroes."""
    days = _RANGE_DAYS.get(range_, 30)
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    prev_start = start - timedelta(days=days)

    users = await db.user.find_many() or []
    jobs = await db.job.find_many() or []

    # Build empty day buckets so gaps render as zero, not missing points.
    buckets = {}
    for i in range(days):
        day = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        buckets[day] = {"date": day, "signups": 0, "jobs": 0, "revenue": 0.0}

    def _bump(collection, ts_key, field, amount=1):
        for row in collection:
            dt = _parse_dt_aware(row.get(ts_key))
            if dt and dt >= start:
                key = dt.strftime("%Y-%m-%d")
                if key in buckets:
                    buckets[key][field] += amount

    _bump(users, "created_at", "signups")
    for j in jobs:
        dt = _parse_dt_aware(j.get("created_at"))
        if dt and dt >= start:
            key = dt.strftime("%Y-%m-%d")
            if key in buckets:
                buckets[key]["jobs"] += 1
        if j.get("status") == "completed":
            cdt = _parse_dt_aware(j.get("completed_at") or j.get("created_at"))
            if cdt and cdt >= start:
                key = cdt.strftime("%Y-%m-%d")
                if key in buckets:
                    buckets[key]["revenue"] += float(j.get("total_price") or 0)

    def _count_between(collection, ts_key, lo, hi, pred=None):
        n = 0
        for row in collection:
            if pred and not pred(row):
                continue
            dt = _parse_dt_aware(row.get(ts_key))
            if dt and lo <= dt < hi:
                n += 1
        return n

    def _delta(cur, prev):
        if prev == 0:
            return 100.0 if cur > 0 else 0.0
        return round((cur - prev) / prev * 100, 1)

    cur_signups = _count_between(users, "created_at", start, now)
    prev_signups = _count_between(users, "created_at", prev_start, start)
    cur_jobs = _count_between(jobs, "created_at", start, now)
    prev_jobs = _count_between(jobs, "created_at", prev_start, start)

    def _rev(lo, hi):
        total = 0.0
        for j in jobs:
            if j.get("status") != "completed":
                continue
            dt = _parse_dt_aware(j.get("completed_at") or j.get("created_at"))
            if dt and lo <= dt < hi:
                total += float(j.get("total_price") or 0)
        return round(total, 2)

    cur_rev, prev_rev = _rev(start, now), _rev(prev_start, start)

    return {
        "range": range_,
        "series": list(buckets.values()),
        "deltas": {
            "signups": {"current": cur_signups, "change_pct": _delta(cur_signups, prev_signups)},
            "jobs": {"current": cur_jobs, "change_pct": _delta(cur_jobs, prev_jobs)},
            "revenue": {"current": cur_rev, "change_pct": _delta(cur_rev, prev_rev)},
        },
    }


# ==================== SUPPORT TOOLKIT ====================

@router.post("/users/{user_id}/force-logout")
async def force_logout(user_id: str, admin = Depends(get_admin_user), db = Depends(get_db)):
    """Immediately revoke all of a user's sessions (bumps token_version)."""
    target = await db.user.find_unique(where={"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await db.user.update(
        where={"id": user_id},
        data={"token_version": int(target.get("token_version", 0) or 0) + 1},
    )
    await record_audit(db, event_type="user.force_logout", actor=admin,
                       target=user_id, details="All sessions revoked")
    return {"ok": True, "user_id": user_id}


@router.post("/users/{user_id}/password-reset-link")
async def admin_password_reset_link(user_id: str, admin = Depends(get_admin_user), db = Depends(get_db)):
    """Generate a single-use password-reset link for a user (support flow).

    Returns the link so support can hand it over; production also emails it.
    """
    target = await db.user.find_unique(where={"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    token = secrets.token_urlsafe(32)
    await db.password_reset.create(data={
        "user_id": user_id,
        "token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
    })
    link = f"{settings.frontend_url}/reset-password?token={token}"
    await record_audit(db, event_type="user.password_reset_issued", actor=admin,
                       target=user_id, details="Admin issued password reset link")
    return {"ok": True, "reset_link": link, "expires_in_minutes": 60}


@router.post("/users/{user_id}/impersonate")
async def impersonate_user(user_id: str, admin = Depends(get_admin_user), db = Depends(get_db)):
    """Issue a short-lived access token as the target user (support login-as).

    Admins cannot impersonate other admins. Always audited.
    """
    from app.api.v1.auth import create_access_token

    target = await db.user.find_unique(where={"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Cannot impersonate another admin")
    if (target.get("status") or "active") != "active":
        raise HTTPException(status_code=400, detail="Cannot impersonate a disabled account")

    token = create_access_token(
        {"sub": target["id"], "role": target["role"],
         "tv": target.get("token_version", 0), "impersonated_by": admin.get("id")},
        expires_delta=timedelta(minutes=15),
    )
    await record_audit(db, event_type="user.impersonated", actor=admin,
                       target=user_id, details=f"Impersonation token issued for {target.get('email')}")
    return {"access_token": token, "token_type": "bearer", "expires_in": 900,
            "user": {"id": target["id"], "email": target["email"], "role": target["role"]}}


@router.get("/export/users")
async def export_users_csv(admin = Depends(get_admin_user), db = Depends(get_db)):
    """Export all users as CSV (id, email, name, phone, role, status, verified, joined).

    Path is /export/users (not /users/export) so it isn't shadowed by the
    dynamic /users/{user_id} route.
    """
    users = await db.user.find_many() or []
    users.sort(key=lambda u: str(u.get("created_at") or ""), reverse=True)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "email", "full_name", "phone", "role", "status", "is_verified", "created_at"])
    for u in users:
        writer.writerow([
            u.get("id"), u.get("email"), u.get("full_name"), u.get("phone"),
            u.get("role"), u.get("status") or "active", u.get("is_verified"), u.get("created_at"),
        ])
    buf.seek(0)
    await record_audit(db, event_type="users.exported", actor=admin,
                       target="all", details=f"Exported {len(users)} users to CSV")
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bookacleaner-users.csv"},
    )


# ==================== ADMIN MFA (TOTP) ====================

class MfaCodeRequest(BaseModel):
    code: str


@router.post("/mfa/setup")
async def mfa_setup(admin = Depends(get_admin_user), db = Depends(get_db)):
    """Begin MFA enrollment: generate a secret (pending until verified) and
    return the otpauth URI for the admin's authenticator app."""
    secret = totp.generate_secret()
    # Store the secret but leave mfa_enabled False until a code is verified, so
    # a half-finished setup can't lock the admin out.
    await db.user.update(where={"id": admin["id"]},
                         data={"mfa_secret": secret, "mfa_enabled": False})
    uri = totp.provisioning_uri(secret, admin.get("email", "admin"))
    return {"secret": secret, "otpauth_uri": uri}


@router.post("/mfa/enable")
async def mfa_enable(payload: MfaCodeRequest, admin = Depends(get_admin_user), db = Depends(get_db)):
    """Confirm enrollment by verifying a code against the pending secret."""
    fresh = await db.user.find_unique(where={"id": admin["id"]})
    secret = (fresh or {}).get("mfa_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="Start MFA setup first")
    if not totp.verify(secret, payload.code):
        raise HTTPException(status_code=400, detail="Invalid code")
    await db.user.update(where={"id": admin["id"]}, data={"mfa_enabled": True})
    await record_audit(db, event_type="admin.mfa_enabled", actor=admin,
                       target=admin["id"], details="Admin enabled MFA")
    return {"ok": True, "mfa_enabled": True}


@router.post("/mfa/disable")
async def mfa_disable(payload: MfaCodeRequest, admin = Depends(get_admin_user), db = Depends(get_db)):
    """Disable MFA — requires a valid current code so a hijacked session can't
    silently turn it off."""
    fresh = await db.user.find_unique(where={"id": admin["id"]})
    secret = (fresh or {}).get("mfa_secret")
    if not (fresh or {}).get("mfa_enabled"):
        return {"ok": True, "mfa_enabled": False}
    if not totp.verify(secret, payload.code):
        raise HTTPException(status_code=400, detail="Invalid code")
    await db.user.update(where={"id": admin["id"]},
                         data={"mfa_enabled": False, "mfa_secret": None})
    await record_audit(db, event_type="admin.mfa_disabled", actor=admin,
                       target=admin["id"], details="Admin disabled MFA")
    return {"ok": True, "mfa_enabled": False}


@router.get("/mfa/status")
async def mfa_status(admin = Depends(get_admin_user), db = Depends(get_db)):
    fresh = await db.user.find_unique(where={"id": admin["id"]})
    return {"mfa_enabled": bool((fresh or {}).get("mfa_enabled"))}
