"""
Background Check Service for BookACleaner.ai
Integration with Checkr for cleaner background verification
"""
import os
import httpx
from typing import Optional, Dict
from datetime import datetime, timezone
import logging

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Checkr API configuration
CHECKR_API_URL = os.getenv("CHECKR_API_URL", "https://api.checkr.com/v1")
CHECKR_API_KEY = os.getenv("CHECKR_API_KEY", "")


class BackgroundCheckService:
    """Service for managing background checks via Checkr API"""
    
    def __init__(self):
        self.api_url = CHECKR_API_URL
        self.api_key = CHECKR_API_KEY
        self.client = httpx.AsyncClient(
            base_url=self.api_url,
            auth=(self.api_key, ""),  # Checkr uses basic auth with API key
            timeout=30.0
        )
    
    async def create_candidate(
        self,
        email: str,
        first_name: str,
        last_name: str,
        phone: Optional[str] = None,
        dob: Optional[str] = None,
        ssn: Optional[str] = None,
        address: Optional[Dict] = None
    ) -> Dict:
        """Create a candidate in Checkr"""
        try:
            payload = {
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
            }
            
            if phone:
                payload["phone"] = phone
            if dob:
                payload["dob"] = dob
            if ssn:
                payload["ssn"] = ssn
            if address:
                payload["address"] = address
            
            response = await self.client.post("/candidates", json=payload)
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Created Checkr candidate: {result.get('id')}")
            return {
                "success": True,
                "candidate_id": result.get("id"),
                "data": result
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to create Checkr candidate: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def initiate_background_check(
        self,
        candidate_id: str,
        package: str = "bookacleaner_standard"
    ) -> Dict:
        """Initiate a background check for a candidate"""
        try:
            # Define check packages
            packages = {
                "bookacleaner_standard": [
                    "ssn_trace",
                    "national_criminal_search",
                    "sex_offender_search"
                ],
                "bookacleaner_premium": [
                    "ssn_trace",
                    "national_criminal_search",
                    "sex_offender_search",
                    "county_criminal_search",
                    "motor_vehicle_report"
                ]
            }
            
            check_types = packages.get(package, packages["bookacleaner_standard"])
            
            payload = {
                "candidate_id": candidate_id,
                "package": package,
                # In production, use Checkr's package system
                # For demo, we specify checks directly
            }
            
            response = await self.client.post("/invitations", json=payload)
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Initiated background check: {result.get('id')}")
            return {
                "success": True,
                "invitation_id": result.get("id"),
                "invitation_url": result.get("invitation_url"),
                "data": result
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to initiate background check: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_report_status(self, report_id: str) -> Dict:
        """Get the status of a background check report"""
        try:
            response = await self.client.get(f"/reports/{report_id}")
            response.raise_for_status()
            
            result = response.json()
            return {
                "success": True,
                "report_id": result.get("id"),
                "status": result.get("status"),  # pending, complete, suspended
                "result": result.get("result"),  # clear, consider, adverse_action
                "completed_at": result.get("completed_at"),
                "turnaround_time": result.get("turnaround_time"),
                "data": result
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to get report status: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def handle_webhook(self, payload: Dict) -> Dict:
        """Handle incoming webhook from Checkr"""
        event_type = payload.get("type")
        data = payload.get("data", {})
        
        logger.info(f"Received Checkr webhook: {event_type}")
        
        if event_type == "report.completed":
            report_id = data.get("object", {}).get("id")
            status = data.get("object", {}).get("status")
            result = data.get("object", {}).get("result")
            
            # Update cleaner verification status in database
            # This would be integrated with the verification service
            return {
                "processed": True,
                "event": event_type,
                "report_id": report_id,
                "result": result
            }
        
        elif event_type == "invitation.completed":
            # Candidate completed their part
            return {
                "processed": True,
                "event": event_type
            }
        
        return {"processed": False, "event": event_type}
    
    async def get_candidate(self, candidate_id: str) -> Dict:
        """Get candidate details"""
        try:
            response = await self.client.get(f"/candidates/{candidate_id}")
            response.raise_for_status()
            return {
                "success": True,
                "data": response.json()
            }
        except httpx.HTTPError as e:
            return {
                "success": False,
                "error": str(e)
            }


# Mock implementation for development without Checkr API key
class MockBackgroundCheckService:
    """Mock service for development/testing"""
    
    async def create_candidate(self, **kwargs) -> Dict:
        return {
            "success": True,
            "candidate_id": f"mock-candidate-{datetime.now(timezone.utc).timestamp()}",
            "data": {"id": "mock-candidate", **kwargs}
        }
    
    async def initiate_background_check(self, candidate_id: str, **kwargs) -> Dict:
        return {
            "success": True,
            "invitation_id": f"mock-invitation-{datetime.now(timezone.utc).timestamp()}",
            "invitation_url": "https://checkr.com/mock-invitation",
            "data": {"status": "pending"}
        }
    
    async def get_report_status(self, report_id: str) -> Dict:
        return {
            "success": True,
            "report_id": report_id,
            "status": "complete",
            "result": "clear",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def handle_webhook(self, payload: Dict) -> Dict:
        return {"processed": True, "mock": True}


# Use mock service if no API key configured
if CHECKR_API_KEY:
    background_check_service = BackgroundCheckService()
else:
    logger.warning("No Checkr API key configured, using mock service")
    background_check_service = MockBackgroundCheckService()
