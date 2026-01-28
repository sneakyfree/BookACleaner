"""
SendGrid Email Service for BookACleaner.ai
Handles all email notifications with beautiful HTML templates
"""
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, HtmlContent
from typing import Optional, List
import logging

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Initialize SendGrid client
sg_client = SendGridAPIClient(settings.sendgrid_api_key)


def get_email_header() -> str:
    """Common email header with logo"""
    return """
    <div style="background-color: #f8fafc; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ✨ BookACleaner.ai
                </h1>
            </div>
            <div style="padding: 40px 30px;">
    """


def get_email_footer() -> str:
    """Common email footer"""
    return """
            </div>
            <div style="background: #f1f5f9; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b;">
                <p style="margin: 0 0 10px;">© 2026 BookACleaner.ai. All rights reserved.</p>
                <p style="margin: 0;">
                    <a href="#" style="color: #0ea5e9; text-decoration: none;">Unsubscribe</a> • 
                    <a href="#" style="color: #0ea5e9; text-decoration: none;">Privacy Policy</a>
                </p>
            </div>
        </div>
    </div>
    """


class EmailService:
    """Service for sending emails via SendGrid"""
    
    def __init__(self):
        self.client = sg_client
        self.from_email = settings.sendgrid_from_email
        self.from_name = "BookACleaner.ai"
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        plain_content: Optional[str] = None
    ) -> dict:
        """Send an email"""
        try:
            message = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=html_content
            )
            if plain_content:
                message.add_content(Content("text/plain", plain_content))
            
            response = self.client.send(message)
            logger.info(f"Email sent to {to_email}: {response.status_code}")
            return {"success": True, "status_code": response.status_code}
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_welcome_email(self, to_email: str, name: str, role: str) -> dict:
        """Send welcome email after registration"""
        subject = "Welcome to BookACleaner.ai! 🎉"
        
        if role == 'cleaner':
            content = f"""
            <h2 style="color: #1e293b; margin-top: 0;">Welcome, {name}!</h2>
            <p style="color: #64748b; line-height: 1.6;">
                You're now part of the BookACleaner.ai community. Here's what to do next:
            </p>
            <ol style="color: #64748b; line-height: 1.8;">
                <li><strong>Complete your profile</strong> - Add your services and service areas</li>
                <li><strong>Get verified</strong> - Unlock more clients with our 5-tier verification</li>
                <li><strong>Set your availability</strong> - Let clients know when you're available</li>
            </ol>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://bookacleaner.ai/cleaner/settings" 
                   style="background: #0ea5e9; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Complete Your Profile
                </a>
            </div>
            """
        else:
            content = f"""
            <h2 style="color: #1e293b; margin-top: 0;">Welcome, {name}!</h2>
            <p style="color: #64748b; line-height: 1.6;">
                You're now part of the BookACleaner.ai community. Finding trusted cleaning professionals has never been easier!
            </p>
            <ul style="color: #64748b; line-height: 1.8; list-style: none; padding: 0;">
                <li>✅ Browse verified cleaning professionals</li>
                <li>✅ Book instantly or request quotes</li>
                <li>✅ Secure payments with money-back guarantee</li>
                <li>✅ Save your properties for quick rebooking</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://bookacleaner.ai/cleaners" 
                   style="background: #0ea5e9; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Find Cleaners
                </a>
            </div>
            """
        
        html = get_email_header() + content + get_email_footer()
        return await self.send_email(to_email, subject, html)
    
    async def send_booking_confirmation(
        self,
        to_email: str,
        client_name: str,
        cleaner_name: str,
        service: str,
        date: str,
        time: str,
        address: str,
        price: float,
        booking_id: str
    ) -> dict:
        """Send booking confirmation to client"""
        subject = f"Booking Confirmed with {cleaner_name} ✨"
        
        content = f"""
        <h2 style="color: #1e293b; margin-top: 0;">Booking Confirmed! 🎉</h2>
        <p style="color: #64748b;">Hi {client_name}, your cleaning is all set!</p>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #64748b;">Service</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: bold; text-align: right;">{service}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b;">Cleaner</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: bold; text-align: right;">{cleaner_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b;">Date & Time</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: bold; text-align: right;">{date} at {time}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b;">Address</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: bold; text-align: right;">{address}</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                    <td style="padding: 12px 0; color: #64748b; font-size: 18px;">Total</td>
                    <td style="padding: 12px 0; color: #0ea5e9; font-weight: bold; text-align: right; font-size: 24px;">${price:.2f}</td>
                </tr>
            </table>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">
            Booking ID: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">{booking_id}</code>
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://bookacleaner.ai/client/bookings" 
               style="background: #0ea5e9; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                View Booking
            </a>
        </div>
        """
        
        html = get_email_header() + content + get_email_footer()
        return await self.send_email(to_email, subject, html)
    
    async def send_review_request(
        self,
        to_email: str,
        client_name: str,
        cleaner_name: str,
        service: str,
        review_link: str
    ) -> dict:
        """Request a review after job completion"""
        subject = f"How was your cleaning with {cleaner_name}? ⭐"
        
        content = f"""
        <h2 style="color: #1e293b; margin-top: 0;">How was your experience?</h2>
        <p style="color: #64748b;">Hi {client_name}, your {service} with {cleaner_name} is complete!</p>
        
        <p style="color: #64748b;">Your feedback helps other clients find great cleaners, and helps {cleaner_name} improve their service.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{review_link}" 
               style="background: #f59e0b; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                ⭐ Leave a Review
            </a>
        </div>
        
        <p style="color: #94a3b8; font-size: 14px; text-align: center;">
            It only takes 30 seconds!
        </p>
        """
        
        html = get_email_header() + content + get_email_footer()
        return await self.send_email(to_email, subject, html)
    
    async def send_verification_email(self, to_email: str, name: str, verify_link: str) -> dict:
        """Send email verification link"""
        subject = "Verify Your Email Address ✉️"
        
        content = f"""
        <h2 style="color: #1e293b; margin-top: 0;">Verify Your Email</h2>
        <p style="color: #64748b;">Hi {name}, thanks for signing up for BookACleaner.ai!</p>
        
        <p style="color: #64748b;">Please click the button below to verify your email address:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{verify_link}" 
               style="background: #10b981; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                ✓ Verify Email
            </a>
        </div>
        
        <p style="color: #94a3b8; font-size: 14px;">
            This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
        """
        
        html = get_email_header() + content + get_email_footer()
        return await self.send_email(to_email, subject, html)
    
    async def send_password_reset(self, to_email: str, reset_link: str) -> dict:
        """Send password reset email"""
        subject = "Reset Your Password"
        
        content = f"""
        <h2 style="color: #1e293b; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #64748b;">We received a request to reset your password. Click the button below to create a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" 
               style="background: #0ea5e9; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Reset Password
            </a>
        </div>
        
        <p style="color: #94a3b8; font-size: 14px;">
            This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
        """
        
        html = get_email_header() + content + get_email_footer()
        return await self.send_email(to_email, subject, html)


# Create singleton instance
email_service = EmailService()
