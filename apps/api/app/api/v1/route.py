"""
Route Optimization API for BookACleaner.ai
Exposes the TSP-based route optimizer to the frontend.
Closes gap F-CAL-3 from implementation plan.
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import logging

from app.database import get_db
from app.config import get_settings
from app.services.route_optimizer import RouteOptimizer
from app.api.deps import get_current_user

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)
optimizer = RouteOptimizer()


class OptimizeRouteRequest(BaseModel):
    date: Optional[str] = None  # ISO format, defaults to today
def _route_dt(v):
    """Coerce a DB datetime/ISO-string into an aware UTC datetime, or None."""
    if v is None:
        return None
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


@router.get("/gaps")
async def get_schedule_gaps(
    date: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Find idle windows (>=60 min) in the cleaner's day on `date`, within an
    08:00-18:00 working window, with a few open jobs as fill-in suggestions."""
    try:
        day = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")

    cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
    booked = []
    if cleaner:
        jobs = await db.job.find_many(where={"cleaner_id": cleaner["id"]}) or []
        for j in jobs:
            sd = _route_dt(j.get("scheduled_date"))
            if not sd or sd.strftime("%Y-%m-%d") != date:
                continue
            if j.get("status") not in ("confirmed", "in_progress", "pending"):
                continue
            hours = j.get("estimated_hours") or 2
            booked.append((sd, sd + timedelta(hours=hours)))
    booked.sort(key=lambda b: b[0])

    # Open (unassigned) jobs offered as gap-fill suggestions.
    all_jobs = await db.job.find_many() or []
    open_jobs = [j for j in all_jobs if j.get("status") == "pending" and not j.get("cleaner_id")][:3]

    def nearby():
        return [{
            "id": j["id"],
            "title": j.get("title") or "Open Job",
            "price": j.get("total_price") or 0,
            "address": j.get("address") or "Nearby",
            "distance_miles": None,
        } for j in open_jobs]

    win_start = day.replace(hour=8)
    win_end = day.replace(hour=18)
    cursor = win_start
    gaps = []
    for start, end in booked:
        if start > cursor and (start - cursor).total_seconds() >= 3600:
            gaps.append({
                "start": cursor.isoformat(),
                "end": start.isoformat(),
                "duration_min": int((start - cursor).total_seconds() // 60),
                "nearby_jobs": nearby(),
            })
        cursor = max(cursor, end)
    if win_end > cursor and (win_end - cursor).total_seconds() >= 3600:
        gaps.append({
            "start": cursor.isoformat(),
            "end": win_end.isoformat(),
            "duration_min": int((win_end - cursor).total_seconds() // 60),
            "nearby_jobs": nearby(),
        })

    return {"gaps": gaps, "date": date}


@router.post("/optimize")
async def optimize_route(
    data: OptimizeRouteRequest,
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Optimize the route for a cleaner's daily jobs."""
    if user.get("role") != "cleaner":
        raise HTTPException(status_code=403, detail="Only cleaners can optimize routes")

    cleaner = await db.cleaner.find_first(where={"user_id": user["id"]})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner profile not found")

    # Get today's jobs
    target_date = data.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    jobs = await db.job.find_many(where={
        "cleaner_id": cleaner["id"],
        "status": "confirmed",
    })

    # Filter to target date
    day_jobs = []
    for job in (jobs or []):
        sd = job.get("scheduled_date")
        if sd and str(sd)[:10] == target_date:
            day_jobs.append(job)

    if len(day_jobs) < 2:
        return {
            "optimized": False,
            "message": "Need at least 2 jobs to optimize a route",
            "jobs": day_jobs,
            "route": [],
        }

    # Build locations from job properties
    locations = []
    for job in day_jobs:
        prop = await db.properties.find_unique(where={"id": job.get("property_id")}) if job.get("property_id") else None
        locations.append({
            "job_id": job["id"],
            "address": prop.get("address", "Unknown") if prop else "Unknown",
            "city": prop.get("city", "") if prop else "",
            "lat": 0,  # Would be geocoded in production
            "lng": 0,
        })

    # Use route optimizer
    try:
        result = optimizer.optimize(locations)
        return {
            "optimized": True,
            "date": target_date,
            "totalJobs": len(day_jobs),
            "route": result.get("route", locations),
            "estimatedTravelMinutes": result.get("total_travel_minutes", 0),
            "timeSavedMinutes": result.get("time_saved_minutes", 0),
        }
    except Exception as e:
        logger.error(f"Route optimization failed: {e}")
        return {
            "optimized": False,
            "message": str(e),
            "jobs": day_jobs,
            "route": locations,
        }
