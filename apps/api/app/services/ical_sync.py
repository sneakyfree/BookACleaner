"""
iCal Sync Service for BookACleaner.ai
Syncs Airbnb/VRBO calendars to automatically create turnover jobs
"""
import httpx
from icalendar import Calendar
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict
import logging
import asyncio

from app.database import get_db
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class ICalEvent:
    """Parsed iCal event"""
    def __init__(self, uid: str, summary: str, start: datetime, end: datetime, description: str = ""):
        self.uid = uid
        self.summary = summary
        self.start = start
        self.end = end
        self.description = description
    
    def __repr__(self):
        return f"ICalEvent({self.summary}, {self.start} - {self.end})"


class ICalSyncService:
    """Service for syncing iCal calendars (Airbnb, VRBO, etc.)"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0, follow_redirects=False)

    async def fetch_calendar(self, ical_url: str) -> Optional[str]:
        """Fetch iCal data from URL"""
        # SSRF guard: the URL is user-supplied (property.airbnb_calendar_url).
        from app.services.ical import _assert_public_http_url
        try:
            await _assert_public_http_url(ical_url)
        except ValueError as e:
            logger.warning(f"Refusing to fetch non-public iCal URL: {e}")
            return None
        try:
            response = await self.client.get(ical_url)
            response.raise_for_status()
            return response.text
        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch iCal: {e}")
            return None
    
    def parse_calendar(self, ical_data: str) -> List[ICalEvent]:
        """Parse iCal data into events"""
        events = []
        try:
            cal = Calendar.from_ical(ical_data)
            for component in cal.walk():
                if component.name == "VEVENT":
                    uid = str(component.get('uid', ''))
                    summary = str(component.get('summary', 'Booking'))
                    start = component.get('dtstart')
                    end = component.get('dtend')
                    description = str(component.get('description', ''))
                    
                    if start and end:
                        start_dt = start.dt if hasattr(start, 'dt') else start
                        end_dt = end.dt if hasattr(end, 'dt') else end
                        
                        # Convert date to datetime if needed
                        if not isinstance(start_dt, datetime):
                            start_dt = datetime.combine(start_dt, datetime.min.time())
                        if not isinstance(end_dt, datetime):
                            end_dt = datetime.combine(end_dt, datetime.min.time())
                        
                        events.append(ICalEvent(
                            uid=uid,
                            summary=summary,
                            start=start_dt,
                            end=end_dt,
                            description=description
                        ))
        except Exception as e:
            logger.error(f"Failed to parse iCal: {e}")
        
        return events
    
    def find_turnovers(self, events: List[ICalEvent]) -> List[Dict]:
        """Find checkout dates that need turnover cleaning"""
        turnovers = []
        
        # Sort events by start date
        sorted_events = sorted(events, key=lambda e: e.start)
        
        for i, event in enumerate(sorted_events):
            checkout_date = event.end
            
            # Check if there's a same-day check-in (turnover needed)
            is_turnover = False
            next_checkin = None
            
            if i + 1 < len(sorted_events):
                next_event = sorted_events[i + 1]
                # If next check-in is within 24 hours of checkout, it's a turnover
                if next_event.start.date() == checkout_date.date():
                    is_turnover = True
                    next_checkin = next_event.start
            
            turnovers.append({
                'checkout_date': checkout_date,
                'checkout_event_uid': event.uid,
                'guest_name': event.summary,
                'is_same_day_turnover': is_turnover,
                'next_checkin': next_checkin,
                # Default turnover window: 11am checkout, 3pm check-in = 4 hours
                'suggested_start_time': checkout_date.replace(hour=11, minute=0),
                'max_duration_hours': 4 if is_turnover else 6,
            })
        
        return turnovers
    
    async def sync_property_calendar(self, property_id: str, ical_url: str) -> Dict:
        """Sync a property's iCal and create/update turnover jobs"""
        db = await get_db()
        
        # Fetch calendar
        ical_data = await self.fetch_calendar(ical_url)
        if not ical_data:
            return {"success": False, "error": "Failed to fetch calendar"}
        
        # Parse events
        events = self.parse_calendar(ical_data)
        logger.info(f"Parsed {len(events)} events from iCal for property {property_id}")
        
        # Find turnovers
        turnovers = self.find_turnovers(events)
        
        # Filter to future turnovers only
        now = datetime.now(timezone.utc)
        future_turnovers = [t for t in turnovers if t['checkout_date'] > now]
        
        # Get property details
        property_data = await db.properties.find_unique(where={"id": property_id})
        if not property_data:
            return {"success": False, "error": "Property not found"}
        
        # Create turnover jobs
        jobs_created = 0
        jobs_updated = 0
        
        for turnover in future_turnovers:
            # Check if job already exists for this turnover
            existing_job = await db.job.find_first(where={
                "property_id": property_id,
                "scheduled_date": turnover['checkout_date'].date().isoformat(),
            })
            
            if not existing_job:
                # Create new turnover job
                job_data = {
                    "client_id": property_data.get("client_id"),
                    "property_id": property_id,
                    "title": f"Turnover: {turnover['guest_name']}" if turnover['guest_name'] else "Turnover Clean",
                    "description": f"Same-day turnover. Max {turnover['max_duration_hours']} hours." if turnover['is_same_day_turnover'] else "Standard turnover clean.",
                    "services": ["airbnb"],
                    "scheduled_date": turnover['checkout_date'],
                    "scheduled_time": "11:00",
                    "estimated_hours": 2.5 if turnover['is_same_day_turnover'] else 3.0,
                    "status": "pending",
                    "base_price": 120.00,
                    "total_price": 120.00,
                }
                await db.job.create(data=job_data)
                jobs_created += 1
        
        return {
            "success": True,
            "events_found": len(events),
            "turnovers_detected": len(future_turnovers),
            "jobs_created": jobs_created,
            "jobs_updated": jobs_updated,
        }
    
    async def sync_all_properties(self) -> Dict:
        """Sync all properties with iCal URLs"""
        db = await get_db()
        
        # Get all properties with iCal URLs
        properties = await db.properties.find_many(where={})
        properties_with_ical = [p for p in properties if p.get("airbnb_calendar_url")]
        
        results = {
            "total_properties": len(properties_with_ical),
            "success": 0,
            "failed": 0,
            "details": []
        }
        
        for prop in properties_with_ical:
            result = await self.sync_property_calendar(
                prop["id"],
                prop["airbnb_calendar_url"]
            )
            if result["success"]:
                results["success"] += 1
            else:
                results["failed"] += 1
            results["details"].append({
                "property_id": prop["id"],
                **result
            })
        
        return results


# Singleton instance
ical_sync_service = ICalSyncService()
