"""
Calendar sync API for BookACleaner.ai — A3.

Provides a real iCal import for cleaners (fetch a public .ics feed → parse the
busy/checkout dates via the existing ical_service) and a real ICS export of the
cleaner's own scheduled jobs.

The Google-Calendar OAuth path is intentionally gated behind configured
credentials: without GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET it returns a clean
503 ("coming soon") instead of 500-ing, and the frontend renders that control
as a disabled state — so there are no dead 404 buttons.
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel

from app.database import get_db
from app.api.deps import get_cleaner_user
from app.services.ical import ical_service

router = APIRouter()
logger = logging.getLogger(__name__)


def _google_configured() -> bool:
    return bool(os.getenv("GOOGLE_CLIENT_ID") and os.getenv("GOOGLE_CLIENT_SECRET"))


class ICalSyncRequest(BaseModel):
    ical_url: str


@router.post("/ical-sync")
async def ical_sync(
    payload: ICalSyncRequest,
    cleaner_user=Depends(get_cleaner_user),
    db=Depends(get_db),
):
    """Import a public iCal (.ics) feed — Airbnb / VRBO / Google — and return the
    busy (checkout) dates it contains. Real fetch + parse (SSRF-guarded)."""
    url = (payload.ical_url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="iCal URL is required")

    try:
        events = await ical_service.fetch_and_parse(url)
    except ValueError as e:
        # SSRF guard / fetch / parse failures surface as a clean 400 string.
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:  # pragma: no cover - defensive
        logger.error(f"iCal sync failed: {e}")
        raise HTTPException(status_code=502, detail="Could not import calendar feed")

    busy_dates = ical_service.get_checkout_dates(events)
    return {
        "synced": True,
        "events_found": len(events),
        "busy_dates": [d.isoformat() for d in busy_dates],
        "message": f"Imported {len(events)} event(s) from your calendar feed.",
    }


@router.get("/auth-url")
async def google_auth_url(
    redirect_uri: Optional[str] = Query(None),
    cleaner_user=Depends(get_cleaner_user),
):
    """Return a Google OAuth authorization URL — only when credentials are
    configured. Otherwise a clean 503 so the UI can show a disabled state."""
    if not _google_configured():
        raise HTTPException(
            status_code=503,
            detail="Google Calendar sync is not configured yet. Coming soon.",
        )
    from app.services.google_calendar import GoogleCalendarService
    svc = GoogleCalendarService()
    url = svc.get_authorization_url(user_id=cleaner_user["id"], redirect_uri=redirect_uri or "")
    return {"url": url, "configured": True}


@router.get("/status")
async def calendar_status(cleaner_user=Depends(get_cleaner_user)):
    """Feature availability so the frontend can render honestly."""
    return {"ical_import": True, "google_configured": _google_configured()}


@router.get("/export/{cleaner_id}.ics")
async def export_ics(cleaner_id: str, db=Depends(get_db)):
    """Export a cleaner's scheduled jobs as a subscribable ICS feed."""
    from icalendar import Calendar as ICal, Event as IEvent

    cleaner = await db.cleaner.find_unique(where={"id": cleaner_id})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner not found")

    jobs = await db.job.find_many(where={"cleaner_id": cleaner_id})
    cal = ICal()
    cal.add("prodid", "-//BookACleaner.ai//Cleaner Schedule//EN")
    cal.add("version", "2.0")
    for job in jobs:
        sched = job.get("scheduled_date")
        if not sched:
            continue
        if isinstance(sched, str):
            try:
                sched = datetime.fromisoformat(sched)
            except ValueError:
                continue
        ev = IEvent()
        ev.add("uid", f"job-{job.get('id')}@bookacleaner.ai")
        ev.add("summary", job.get("title") or "Cleaning job")
        ev.add("dtstart", sched)
        ev.add("dtstamp", datetime.now(timezone.utc))
        cal.add_component(ev)

    return Response(content=cal.to_ical(), media_type="text/calendar")
