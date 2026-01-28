"""
Google Calendar Integration for BookACleaner.ai
Syncs jobs to cleaner's Google Calendar
"""
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import logging

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# OAuth 2.0 scopes for Calendar access
SCOPES = ['https://www.googleapis.com/auth/calendar.events']

# OAuth client config (from Google Cloud Console)
CLIENT_CONFIG = {
    "web": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [
            os.getenv("GOOGLE_CALENDAR_REDIRECT_URI", "http://localhost:3000/api/calendar/callback")
        ]
    }
}


class GoogleCalendarService:
    """Service for syncing jobs to Google Calendar"""
    
    def __init__(self):
        self.client_config = CLIENT_CONFIG
    
    def get_authorization_url(self, user_id: str, redirect_uri: str) -> str:
        """Generate OAuth authorization URL for calendar access"""
        flow = Flow.from_client_config(
            self.client_config,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=user_id,  # Pass user_id through state
            prompt='consent'
        )
        
        return authorization_url
    
    async def exchange_code(self, code: str, redirect_uri: str) -> Dict:
        """Exchange authorization code for tokens"""
        flow = Flow.from_client_config(
            self.client_config,
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        return {
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "expiry": credentials.expiry.isoformat() if credentials.expiry else None
        }
    
    def _get_service(self, credentials_dict: Dict):
        """Build Google Calendar service from stored credentials"""
        credentials = Credentials(
            token=credentials_dict["access_token"],
            refresh_token=credentials_dict.get("refresh_token"),
            token_uri=credentials_dict.get("token_uri", "https://oauth2.googleapis.com/token"),
            client_id=credentials_dict.get("client_id") or os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=credentials_dict.get("client_secret") or os.getenv("GOOGLE_CLIENT_SECRET"),
        )
        
        return build('calendar', 'v3', credentials=credentials)
    
    async def add_job_to_calendar(
        self,
        credentials_dict: Dict,
        job: Dict,
        property_data: Dict = None
    ) -> Optional[str]:
        """Add a job to the cleaner's Google Calendar"""
        try:
            service = self._get_service(credentials_dict)
            
            # Build event
            start_time = job.get("scheduled_date")
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            
            # Parse scheduled time
            scheduled_time = job.get("scheduled_time", "09:00")
            if scheduled_time:
                hour, minute = map(int, scheduled_time.split(":"))
                start_time = start_time.replace(hour=hour, minute=minute)
            
            # Calculate end time
            estimated_hours = job.get("estimated_hours", 2)
            end_time = start_time + timedelta(hours=estimated_hours)
            
            # Build location string
            location = ""
            if property_data:
                parts = [
                    property_data.get("address", ""),
                    property_data.get("city", ""),
                    property_data.get("state", ""),
                    property_data.get("zip_code", "")
                ]
                location = ", ".join(filter(None, parts))
            
            event = {
                'summary': f"🧹 {job.get('title', 'Cleaning Job')}",
                'description': f"""
Job ID: {job.get('id')}
Services: {', '.join(job.get('services', []))}
Price: ${job.get('total_price', 0):.2f}

{job.get('description', '')}

--- BookACleaner.ai ---
                """.strip(),
                'location': location,
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': 'America/Los_Angeles',
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': 'America/Los_Angeles',
                },
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'popup', 'minutes': 60},
                        {'method': 'popup', 'minutes': 15},
                    ],
                },
                'colorId': '7',  # Cyan color for cleaning jobs
            }
            
            result = service.events().insert(calendarId='primary', body=event).execute()
            logger.info(f"Created calendar event: {result.get('id')}")
            return result.get('id')
            
        except HttpError as e:
            logger.error(f"Failed to add job to calendar: {e}")
            return None
    
    async def update_job_in_calendar(
        self,
        credentials_dict: Dict,
        event_id: str,
        job: Dict,
        property_data: Dict = None
    ) -> bool:
        """Update an existing calendar event"""
        try:
            service = self._get_service(credentials_dict)
            
            # Get existing event
            event = service.events().get(calendarId='primary', eventId=event_id).execute()
            
            # Update fields
            event['summary'] = f"🧹 {job.get('title', 'Cleaning Job')}"
            
            start_time = job.get("scheduled_date")
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            
            scheduled_time = job.get("scheduled_time", "09:00")
            if scheduled_time:
                hour, minute = map(int, scheduled_time.split(":"))
                start_time = start_time.replace(hour=hour, minute=minute)
            
            estimated_hours = job.get("estimated_hours", 2)
            end_time = start_time + timedelta(hours=estimated_hours)
            
            event['start']['dateTime'] = start_time.isoformat()
            event['end']['dateTime'] = end_time.isoformat()
            
            service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event
            ).execute()
            
            logger.info(f"Updated calendar event: {event_id}")
            return True
            
        except HttpError as e:
            logger.error(f"Failed to update calendar event: {e}")
            return False
    
    async def remove_job_from_calendar(
        self,
        credentials_dict: Dict,
        event_id: str
    ) -> bool:
        """Delete a job from the calendar"""
        try:
            service = self._get_service(credentials_dict)
            service.events().delete(calendarId='primary', eventId=event_id).execute()
            logger.info(f"Deleted calendar event: {event_id}")
            return True
        except HttpError as e:
            logger.error(f"Failed to delete calendar event: {e}")
            return False
    
    async def list_upcoming_events(
        self,
        credentials_dict: Dict,
        max_results: int = 10
    ) -> List[Dict]:
        """List upcoming calendar events"""
        try:
            service = self._get_service(credentials_dict)
            now = datetime.utcnow().isoformat() + 'Z'
            
            events_result = service.events().list(
                calendarId='primary',
                timeMin=now,
                maxResults=max_results,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            return events_result.get('items', [])
            
        except HttpError as e:
            logger.error(f"Failed to list calendar events: {e}")
            return []


# Singleton instance
google_calendar_service = GoogleCalendarService()
