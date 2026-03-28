"""
Route Optimization API for BookACleaner.ai
Exposes the TSP-based route optimizer to the frontend.
Closes gap F-CAL-3 from implementation plan.
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
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
        prop = await db.property.find_unique(where={"id": job.get("property_id")}) if job.get("property_id") else None
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
