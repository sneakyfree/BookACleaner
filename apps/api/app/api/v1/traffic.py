"""
First-party, privacy-friendly page-view tracking. Public (no auth) so the web
client can beacon route changes. Stores NO IP and sets NO cookie — country is
best-effort from the edge header, and the visitor hash is coarse and
daily-rotating so it can't be reversed to a person.
"""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from urllib.parse import urlparse
import hashlib
import logging

from app.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


class TrackRequest(BaseModel):
    path: str = Field(max_length=255)
    referrer: str | None = Field(default=None, max_length=500)


def _referrer_host(referrer: str | None) -> str | None:
    if not referrer:
        return None
    try:
        host = urlparse(referrer).hostname
        return host[:255] if host else None
    except Exception:  # noqa: BLE001
        return None


def _device(ua: str) -> str:
    ua = (ua or "").lower()
    if "mobile" in ua or "iphone" in ua or "android" in ua:
        return "mobile"
    if "ipad" in ua or "tablet" in ua:
        return "tablet"
    return "desktop"


def _visitor_hash(request: Request) -> str:
    """Coarse daily-rotating visitor id — hash of (IP + UA + UTC date). The IP
    itself is never stored, and the day-salt means it can't be linked across
    days."""
    xff = request.headers.get("x-forwarded-for", "")
    ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else "")
    ua = request.headers.get("user-agent", "")
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return hashlib.sha256(f"{ip}|{ua}|{day}".encode()).hexdigest()


@router.post("/track", status_code=202)
async def track_pageview(data: TrackRequest, request: Request, db=Depends(get_db)):
    """Record a page view. Fire-and-forget from the client; failures are never
    surfaced to the visitor."""
    try:
        path = (data.path or "/")[:255]
        # Country from the Cloudflare edge header when present (the app is
        # fronted by a CF tunnel); harmless when absent.
        country = (request.headers.get("cf-ipcountry") or "")[:2].upper() or None
        if country in ("XX", "T1"):  # CF placeholders for unknown/Tor
            country = None
        await db.page_view.create(data={
            "path": path,
            "referrer_host": _referrer_host(data.referrer),
            "country": country,
            "device": _device(request.headers.get("user-agent", "")),
            "visitor_hash": _visitor_hash(request),
        })
    except Exception as e:  # noqa: BLE001 — analytics must never break a page load
        logger.warning(f"pageview track failed: {e}")
    return {"ok": True}
