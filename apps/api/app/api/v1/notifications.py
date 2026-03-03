"""
Notifications API for BookACleaner.ai
Handles in-app notifications, email, and SMS notifications
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

from app.database import get_db
from app.config import get_settings
from app.services.sms import sms_service
from app.services.email import email_service
from app.api.deps import get_current_user

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


# ==================== SCHEMAS ====================

class SendSMSRequest(BaseModel):
    to: str
    message: str


class SendEmailRequest(BaseModel):
    to: str
    subject: str
    html_content: str


class SendBookingNotificationRequest(BaseModel):
    client_email: str
    client_phone: Optional[str] = None
    client_name: str
    cleaner_name: str
    service: str
    date: str
    time: str
    address: str
    price: float
    booking_id: str


class SendReminderRequest(BaseModel):
    to_email: str
    to_phone: Optional[str] = None
    name: str
    role: str  # 'client' or 'cleaner'
    other_party: str
    date: str
    time: str
    address: str


# ==================== AUTH HELPER ====================
async def get_admin_user(user = Depends(get_current_user)):
    """Require admin role"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ==================== IN-APP NOTIFICATIONS ====================

@router.get("/")
async def list_notifications(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """List notifications for current user"""
    
    where = {"user_id": user["id"]}
    if unread_only:
        where["read"] = False
    
    notifications = await db.notification.find_many(where=where)
    
    # Sort by date descending
    notifications.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    
    # Paginate
    start = (page - 1) * limit
    end = start + limit
    
    return {
        "notifications": notifications[start:end],
        "total": len(notifications),
        "unread_count": sum(1 for n in notifications if not n.get("read")),
    }


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Mark notification as read"""
    
    notification = await db.notification.update(
        where={"id": notification_id},
        data={"read": True, "read_at": datetime.utcnow()}
    )
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"marked_read": True}


@router.post("/read-all")
async def mark_all_read(
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Mark all notifications as read"""
    
    notifications = await db.notification.find_many(where={"user_id": user["id"], "read": False})
    
    for n in notifications:
        await db.notification.update(
            where={"id": n["id"]},
            data={"read": True, "read_at": datetime.utcnow()}
        )
    
    return {"marked_read": len(notifications)}


class RegisterDeviceRequest(BaseModel):
    fcm_token: str
    device_type: str = "web"  # web, ios, android


@router.post("/register-device")
async def register_device(
    data: RegisterDeviceRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Register a device for push notifications"""
    from app.models import generate_uuid

    # Check if token already registered
    existing = await db.execute(
        "SELECT id FROM push_tokens WHERE fcm_token = :token AND user_id = :uid",
        {"token": data.fcm_token, "uid": user["id"]}
    )
    if existing:
        return {"status": "already_registered"}

    # Delete old tokens for this user + device type
    await db.execute(
        "DELETE FROM push_tokens WHERE user_id = :uid AND device_type = :dtype",
        {"uid": user["id"], "dtype": data.device_type}
    )

    # Insert new token
    await db.execute(
        """INSERT INTO push_tokens (id, user_id, fcm_token, device_type, created_at)
           VALUES (:id, :uid, :token, :dtype, :now)""",
        {
            "id": generate_uuid(), "uid": user["id"],
            "token": data.fcm_token, "dtype": data.device_type,
            "now": datetime.utcnow()
        }
    )

    logger.info(f"Registered push token for user {user['id']} ({data.device_type})")
    return {"status": "registered"}


@router.delete("/unregister-device")
async def unregister_device(
    fcm_token: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Unregister a device from push notifications"""
    await db.execute(
        "DELETE FROM push_tokens WHERE fcm_token = :token AND user_id = :uid",
        {"token": fcm_token, "uid": user["id"]}
    )
    return {"status": "unregistered"}


@router.get("/unread-count")
async def get_unread_count(
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get unread notification count"""
    
    notifications = await db.notification.find_many(where={"user_id": user["id"], "read": False})
    
    return {"unread_count": len(notifications)}


# ==================== SEND NOTIFICATIONS (AUTH REQUIRED) ====================

@router.post("/sms")
async def send_sms(data: SendSMSRequest, user = Depends(get_admin_user)):
    """Send a custom SMS message (admin only)"""
    result = await sms_service.send_sms(data.to, data.message)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "SMS failed"))
    return result


@router.post("/email")
async def send_email(data: SendEmailRequest, user = Depends(get_admin_user)):
    """Send a custom email (admin only)"""
    result = await email_service.send_email(data.to, data.subject, data.html_content)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Email failed"))
    return result


@router.post("/booking-confirmation")
async def send_booking_confirmation(
    data: SendBookingNotificationRequest,
    user = Depends(get_current_user)
):
    """Send booking confirmation via email and SMS"""
    results = {}
    
    # Send email
    email_result = await email_service.send_booking_confirmation(
        to_email=data.client_email,
        client_name=data.client_name,
        cleaner_name=data.cleaner_name,
        service=data.service,
        date=data.date,
        time=data.time,
        address=data.address,
        price=data.price,
        booking_id=data.booking_id
    )
    results["email"] = email_result
    
    # Send SMS if phone provided
    if data.client_phone:
        sms_result = await sms_service.send_booking_confirmation(
            to=data.client_phone,
            cleaner_name=data.cleaner_name,
            date=data.date,
            time=data.time,
            address=data.address
        )
        results["sms"] = sms_result
    
    return results


@router.post("/reminder")
async def send_reminder(data: SendReminderRequest, user = Depends(get_current_user)):
    """Send appointment reminder via email and SMS"""
    results = {}
    
    # Send SMS if phone provided
    if data.to_phone:
        sms_result = await sms_service.send_reminder(
            to=data.to_phone,
            role=data.role,
            other_party=data.other_party,
            date=data.date,
            time=data.time,
            address=data.address
        )
        results["sms"] = sms_result
    
    return results


@router.post("/job-started")
async def notify_job_started(
    client_phone: str,
    client_email: str,
    cleaner_name: str,
    user = Depends(get_current_user)
):
    """Notify client that job has started"""
    results = {}
    
    sms_result = await sms_service.send_job_started(client_phone, cleaner_name)
    results["sms"] = sms_result
    
    return results


@router.post("/job-completed")
async def notify_job_completed(
    client_phone: str,
    client_email: str,
    client_name: str,
    cleaner_name: str,
    service: str,
    job_id: str,
    user = Depends(get_current_user)
):
    """Notify client that job is completed and request review"""
    results = {}
    
    review_link = f"{settings.frontend_url}/reviews/new?jobId={job_id}"
    
    # Send SMS
    sms_result = await sms_service.send_job_completed(
        client_phone, cleaner_name, review_link
    )
    results["sms"] = sms_result
    
    # Send email
    email_result = await email_service.send_review_request(
        to_email=client_email,
        client_name=client_name,
        cleaner_name=cleaner_name,
        service=service,
        review_link=review_link
    )
    results["email"] = email_result
    
    return results


@router.post("/payment-received")
async def notify_payment_received(
    cleaner_phone: str,
    amount: float,
    user = Depends(get_current_user)
):
    """Notify cleaner of payment received"""
    result = await sms_service.send_payment_received(cleaner_phone, amount)
    return result
