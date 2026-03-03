"""
Twilio SMS Service for BookACleaner.ai
Handles all SMS notifications including booking confirmations, reminders, and OTP

NOTE — TRIAL ACCOUNT LIMITATION:
Twilio is currently on a TRIAL account. It can only send SMS to phone numbers
that have been verified in the Twilio console. The only verified number at
this time is: +18012599358
Until the account is upgraded to a paid plan, any send_sms() call to an
unverified number will raise a TwilioRestException (error 21608).
"""
import os
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from typing import Optional
import logging

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Twilio client is lazily initialized in SMSService to avoid
# import-time crash with mock/dev credentials.
twilio_client = None


class SMSService:
    """Service for sending SMS notifications via Twilio"""
    
    def __init__(self):
        global twilio_client
        self.from_number = settings.twilio_phone_number
        # Dev-mode detection — check BEFORE creating Twilio client
        sid = settings.twilio_account_sid or ""
        self.is_dev = (
            not sid
            or sid.startswith("AC_mock")
            or sid == "AC_mock_dev_sid"
            or len(sid) < 20
        )
        if self.is_dev:
            self.client = None
            logger.info("📱 SMS service running in DEV MODE — messages will be logged to console")
        else:
            # Only create Twilio client with real credentials
            if twilio_client is None:
                try:
                    twilio_client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
                except Exception as e:
                    logger.error(f"Failed to initialize Twilio client: {e}")
                    twilio_client = None
            self.client = twilio_client
    
    async def send_sms(self, to: str, message: str) -> dict:
        """Send an SMS message"""
        if self.is_dev:
            logger.info(f"\n{'='*60}")
            logger.info(f"📱 DEV SMS — To: {to}")
            logger.info(f"   Message: {message}")
            logger.info(f"{'='*60}\n")
            return {"success": True, "dev_mode": True}

        try:
            message = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to
            )
            logger.info(f"SMS sent to {to}: {message.sid}")
            return {"success": True, "message_sid": message.sid}
        except TwilioRestException as e:
            logger.error(f"Failed to send SMS to {to}: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_otp(self, to: str, code: str) -> dict:
        """Send OTP verification code"""
        message = f"Your BookACleaner verification code is: {code}. This code expires in 10 minutes."
        return await self.send_sms(to, message)
    
    async def send_verification_code(self, to: str, code: str) -> dict:
        """Send phone verification code - alias for send_otp"""
        return await self.send_otp(to, code)
    
    async def send_booking_confirmation(
        self,
        to: str,
        cleaner_name: str,
        date: str,
        time: str,
        address: str
    ) -> dict:
        """Send booking confirmation SMS to client"""
        message = (
            f"BookACleaner: Your booking with {cleaner_name} is confirmed!\n"
            f"📅 {date} at {time}\n"
            f"📍 {address}\n"
            f"We'll remind you before your appointment."
        )
        return await self.send_sms(to, message)
    
    async def send_job_notification(
        self,
        to: str,
        client_name: str,
        service: str,
        date: str,
        time: str,
        price: float
    ) -> dict:
        """Send new job notification to cleaner"""
        message = (
            f"BookACleaner: New job request!\n"
            f"👤 {client_name}\n"
            f"🧹 {service}\n"
            f"📅 {date} at {time}\n"
            f"💵 ${price:.2f}\n"
            f"Reply ACCEPT or DECLINE"
        )
        return await self.send_sms(to, message)
    
    async def send_reminder(
        self,
        to: str,
        role: str,  # 'client' or 'cleaner'
        other_party: str,
        date: str,
        time: str,
        address: str
    ) -> dict:
        """Send appointment reminder (24h and 1h before)"""
        if role == 'client':
            message = (
                f"BookACleaner Reminder: {other_party} will arrive tomorrow at {time}.\n"
                f"📍 {address}\n"
                f"Please ensure access is available."
            )
        else:
            message = (
                f"BookACleaner Reminder: You have a job tomorrow at {time}.\n"
                f"👤 Client: {other_party}\n"
                f"📍 {address}"
            )
        return await self.send_sms(to, message)
    
    async def send_job_started(self, to: str, cleaner_name: str) -> dict:
        """Notify client that cleaner has started the job"""
        message = f"BookACleaner: {cleaner_name} has started cleaning your property. 🧹"
        return await self.send_sms(to, message)
    
    async def send_job_completed(self, to: str, cleaner_name: str, review_link: str) -> dict:
        """Notify client that job is completed"""
        message = (
            f"BookACleaner: {cleaner_name} has completed your cleaning! ✨\n"
            f"Please leave a review: {review_link}"
        )
        return await self.send_sms(to, message)
    
    async def send_payment_received(self, to: str, amount: float) -> dict:
        """Notify cleaner of payment received"""
        message = f"BookACleaner: Payment of ${amount:.2f} has been deposited to your account. 💰"
        return await self.send_sms(to, message)


# Create singleton instance
sms_service = SMSService()
