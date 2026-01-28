"""
Push Notification Service for BookACleaner.ai
Firebase Cloud Messaging integration for web and mobile push notifications
"""
import os
import json
from typing import Optional, List, Dict
import logging

import firebase_admin
from firebase_admin import credentials, messaging

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
FIREBASE_CREDENTIALS = os.getenv("FIREBASE_CREDENTIALS_PATH", "")

if FIREBASE_CREDENTIALS and os.path.exists(FIREBASE_CREDENTIALS):
    cred = credentials.Certificate(FIREBASE_CREDENTIALS)
    firebase_admin.initialize_app(cred)
    FIREBASE_INITIALIZED = True
elif os.getenv("FIREBASE_CREDENTIALS_JSON"):
    cred_dict = json.loads(os.getenv("FIREBASE_CREDENTIALS_JSON", "{}"))
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)
    FIREBASE_INITIALIZED = True
else:
    FIREBASE_INITIALIZED = False
    logger.warning("Firebase credentials not configured, push notifications disabled")


class PushNotificationService:
    """Service for sending push notifications via Firebase Cloud Messaging"""
    
    def __init__(self):
        self.initialized = FIREBASE_INITIALIZED
    
    async def send_to_device(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        image: Optional[str] = None,
        badge: Optional[int] = None
    ) -> Dict:
        """Send push notification to a single device"""
        if not self.initialized:
            logger.warning("Firebase not initialized, skipping push")
            return {"success": False, "error": "Firebase not initialized"}
        
        try:
            notification = messaging.Notification(
                title=title,
                body=body,
                image=image
            )
            
            # Platform-specific config
            android_config = messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    icon="ic_notification",
                    color="#0ea5e9",
                    sound="default",
                    click_action="OPEN_APP"
                )
            )
            
            apns_config = messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        badge=badge,
                        sound="default",
                        content_available=True
                    )
                )
            )
            
            web_config = messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    icon="/icons/notification-icon.png",
                    badge="/icons/badge-icon.png",
                    actions=[
                        messaging.WebpushNotificationAction("view", "View"),
                        messaging.WebpushNotificationAction("dismiss", "Dismiss")
                    ]
                )
            )
            
            message = messaging.Message(
                notification=notification,
                data=data or {},
                token=token,
                android=android_config,
                apns=apns_config,
                webpush=web_config
            )
            
            response = messaging.send(message)
            logger.info(f"Push sent successfully: {response}")
            return {"success": True, "message_id": response}
            
        except Exception as e:
            logger.error(f"Failed to send push: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_to_multiple(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict] = None
    ) -> Dict:
        """Send push notification to multiple devices"""
        if not self.initialized:
            return {"success": False, "error": "Firebase not initialized"}
        
        try:
            message = messaging.MulticastMessage(
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                tokens=tokens
            )
            
            response = messaging.send_multicast(message)
            
            return {
                "success": True,
                "success_count": response.success_count,
                "failure_count": response.failure_count,
                "responses": [
                    {"success": r.success, "message_id": r.message_id if r.success else None}
                    for r in response.responses
                ]
            }
            
        except Exception as e:
            logger.error(f"Failed to send multicast push: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[Dict] = None
    ) -> Dict:
        """Send push notification to a topic"""
        if not self.initialized:
            return {"success": False, "error": "Firebase not initialized"}
        
        try:
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                topic=topic
            )
            
            response = messaging.send(message)
            return {"success": True, "message_id": response}
            
        except Exception as e:
            logger.error(f"Failed to send topic push: {e}")
            return {"success": False, "error": str(e)}
    
    async def subscribe_to_topic(self, tokens: List[str], topic: str) -> Dict:
        """Subscribe devices to a topic"""
        if not self.initialized:
            return {"success": False, "error": "Firebase not initialized"}
        
        try:
            response = messaging.subscribe_to_topic(tokens, topic)
            return {
                "success": True,
                "success_count": response.success_count,
                "failure_count": response.failure_count
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def unsubscribe_from_topic(self, tokens: List[str], topic: str) -> Dict:
        """Unsubscribe devices from a topic"""
        if not self.initialized:
            return {"success": False, "error": "Firebase not initialized"}
        
        try:
            response = messaging.unsubscribe_from_topic(tokens, topic)
            return {
                "success": True,
                "success_count": response.success_count,
                "failure_count": response.failure_count
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ==================== NOTIFICATION TEMPLATES ====================
    
    async def send_booking_confirmed(
        self,
        token: str,
        cleaner_name: str,
        date: str,
        time: str
    ) -> Dict:
        """Send booking confirmation push"""
        return await self.send_to_device(
            token=token,
            title="Booking Confirmed! ✨",
            body=f"Your cleaning with {cleaner_name} is confirmed for {date} at {time}",
            data={"type": "booking_confirmed", "action": "view_booking"}
        )
    
    async def send_job_reminder(
        self,
        token: str,
        address: str,
        time: str,
        hours_until: int = 24
    ) -> Dict:
        """Send job reminder push"""
        title = "Upcoming Job Reminder" if hours_until > 1 else "Job Starting Soon!"
        return await self.send_to_device(
            token=token,
            title=title,
            body=f"You have a cleaning at {address} at {time}",
            data={"type": "job_reminder", "action": "view_job"}
        )
    
    async def send_new_message(
        self,
        token: str,
        sender_name: str,
        preview: str
    ) -> Dict:
        """Send new message push"""
        return await self.send_to_device(
            token=token,
            title=f"New message from {sender_name}",
            body=preview[:100] + "..." if len(preview) > 100 else preview,
            data={"type": "new_message", "action": "open_chat"}
        )
    
    async def send_payment_received(
        self,
        token: str,
        amount: float
    ) -> Dict:
        """Send payment received push to cleaner"""
        return await self.send_to_device(
            token=token,
            title="Payment Received! 💰",
            body=f"${amount:.2f} has been added to your balance",
            data={"type": "payment_received", "action": "view_earnings"}
        )
    
    async def send_new_job_available(
        self,
        token: str,
        job_title: str,
        price: float
    ) -> Dict:
        """Send new marketplace job notification to cleaners"""
        return await self.send_to_device(
            token=token,
            title="New Job Available! 🧹",
            body=f"{job_title} - ${price:.2f}",
            data={"type": "new_job", "action": "view_marketplace"}
        )


# Singleton instance
push_service = PushNotificationService()
