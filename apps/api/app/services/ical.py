"""
iCal Calendar Service for BookACleaner.ai
Parses Airbnb/VRBO calendar feeds and creates turnover jobs
"""
import httpx
from icalendar import Calendar
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
import logging

from app.database import get_db

logger = logging.getLogger(__name__)


class CalendarEvent:
    """Represents a parsed calendar event (reservation)"""
    
    def __init__(
        self,
        uid: str,
        summary: str,
        check_in: date,
        check_out: date,
        description: Optional[str] = None
    ):
        self.uid = uid
        self.summary = summary
        self.check_in = check_in
        self.check_out = check_out
        self.description = description
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "uid": self.uid,
            "summary": self.summary,
            "check_in": self.check_in.isoformat() if isinstance(self.check_in, date) else str(self.check_in),
            "check_out": self.check_out.isoformat() if isinstance(self.check_out, date) else str(self.check_out),
            "description": self.description,
        }


class ICalService:
    """Service for parsing iCal feeds and managing calendar events"""
    
    def __init__(self):
        self.http_client = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self.http_client is None:
            self.http_client = httpx.AsyncClient(timeout=30.0)
        return self.http_client
    
    async def fetch_calendar(self, url: str) -> str:
        """Fetch raw iCal data from URL"""
        try:
            client = await self._get_client()
            response = await client.get(url)
            response.raise_for_status()
            return response.text
        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch calendar: {e}")
            raise ValueError(f"Failed to fetch calendar: {str(e)}")
    
    def parse_ical(self, ical_data: str) -> List[CalendarEvent]:
        """Parse iCal data into CalendarEvent objects"""
        try:
            cal = Calendar.from_ical(ical_data)
        except Exception as e:
            logger.error(f"Failed to parse iCal: {e}")
            raise ValueError(f"Invalid iCal format: {str(e)}")
        
        events = []
        
        for component in cal.walk():
            if component.name == "VEVENT":
                try:
                    uid = str(component.get("UID", ""))
                    summary = str(component.get("SUMMARY", "Reservation"))
                    description = str(component.get("DESCRIPTION", "")) if component.get("DESCRIPTION") else None
                    
                    # Get dates
                    dtstart = component.get("DTSTART")
                    dtend = component.get("DTEND")
                    
                    if dtstart and dtend:
                        check_in = dtstart.dt
                        check_out = dtend.dt
                        
                        # Convert datetime to date if needed
                        if isinstance(check_in, datetime):
                            check_in = check_in.date()
                        if isinstance(check_out, datetime):
                            check_out = check_out.date()
                        
                        events.append(CalendarEvent(
                            uid=uid,
                            summary=summary,
                            check_in=check_in,
                            check_out=check_out,
                            description=description,
                        ))
                except Exception as e:
                    logger.warning(f"Failed to parse event: {e}")
                    continue
        
        # Sort by check-in date
        events.sort(key=lambda e: e.check_in)
        
        return events
    
    async def fetch_and_parse(self, url: str) -> List[CalendarEvent]:
        """Fetch and parse iCal from URL"""
        ical_data = await self.fetch_calendar(url)
        return self.parse_ical(ical_data)
    
    def get_checkout_dates(
        self,
        events: List[CalendarEvent],
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[date]:
        """Extract checkout dates from events within date range"""
        if start_date is None:
            start_date = date.today()
        if end_date is None:
            end_date = start_date + timedelta(days=30)
        
        checkout_dates = []
        
        for event in events:
            if start_date <= event.check_out <= end_date:
                checkout_dates.append(event.check_out)
        
        return sorted(set(checkout_dates))
    
    async def sync_property_calendar(
        self,
        property_id: str,
        calendar_url: str,
        db
    ) -> Dict[str, Any]:
        """Sync property calendar and create turnover jobs"""
        
        # Fetch and parse calendar
        events = await self.fetch_and_parse(calendar_url)
        
        # Get checkout dates for next 30 days
        checkout_dates = self.get_checkout_dates(events)
        
        # Get property details
        prop = await db.properties.find_unique(where={"id": property_id})
        if not prop:
            raise ValueError("Property not found")
        
        # Get client info
        client_id = prop.get("client_id")
        
        # Check existing jobs to avoid duplicates
        existing_jobs = await db.job.find_many(where={"property_id": property_id})
        existing_dates = set()
        for job in existing_jobs:
            if job.get("scheduled_date"):
                job_date = job["scheduled_date"]
                if isinstance(job_date, str):
                    job_date = datetime.fromisoformat(job_date).date()
                elif isinstance(job_date, datetime):
                    job_date = job_date.date()
                existing_dates.add(job_date)
        
        # Create jobs for new checkout dates
        jobs_created = []
        for checkout_date in checkout_dates:
            if checkout_date not in existing_dates:
                job = await db.job.create(data={
                    "client_id": client_id,
                    "property_id": property_id,
                    "title": f"Turnover Clean - {prop.get('name', 'Property')}",
                    "description": f"Automatic turnover job from Airbnb calendar. Checkout date: {checkout_date}",
                    "services": ["airbnb"],
                    "scheduled_date": datetime.combine(checkout_date, datetime.min.time()),
                    "scheduled_time": "11:00",  # Default checkout time
                    "estimated_hours": 2.0,
                    "base_price": 120.0,  # Airbnb turnover base price
                    "total_price": 120.0,
                    "status": "pending",
                })
                jobs_created.append(job)
        
        return {
            "synced": True,
            "events_found": len(events),
            "checkout_dates_found": len(checkout_dates),
            "jobs_created": len(jobs_created),
            "new_job_ids": [j["id"] for j in jobs_created],
        }


# Singleton instance
ical_service = ICalService()
