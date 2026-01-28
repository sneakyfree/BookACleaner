"""
Input Validation Module with Pydantic v2 Strict Mode
Enhanced validation for all API inputs
"""

from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator
from typing import Optional, List, Literal
from datetime import date, time, datetime
import re


# ============================================
# Base Models with Strict Validation
# ============================================

class StrictBaseModel(BaseModel):
    """Base model with strict validation settings"""
    
    class Config:
        str_strip_whitespace = True
        str_min_length = 1
        validate_assignment = True
        extra = "forbid"


# ============================================
# User Validation Models
# ============================================

class UserCreateRequest(StrictBaseModel):
    """Validated user creation request"""
    
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    role: Literal["client", "cleaner"] = "client"
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v
    
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        # Remove non-numeric characters for validation
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError("Phone number must be 10-15 digits")
        return v
    
    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not re.match(r"^[\w\s\-'.]+$", v):
            raise ValueError("Name contains invalid characters")
        return v


class UserUpdateRequest(StrictBaseModel):
    """Validated user update request"""
    
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    bio: Optional[str] = Field(default=None, max_length=1000)
    avatar_url: Optional[str] = None
    
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError("Phone number must be 10-15 digits")
        return v


# ============================================
# Property Validation Models
# ============================================

class PropertyCreateRequest(StrictBaseModel):
    """Validated property creation request"""
    
    address: str = Field(min_length=10, max_length=200)
    property_type: Literal["apartment", "house", "condo", "office", "airbnb"]
    bedrooms: int = Field(ge=0, le=20)
    bathrooms: int = Field(ge=1, le=20)
    sqft: Optional[int] = Field(default=None, ge=100, le=50000)
    has_pets: bool = False
    access_instructions: Optional[str] = Field(default=None, max_length=500)
    special_notes: Optional[str] = Field(default=None, max_length=1000)
    
    @field_validator("address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        # Basic address format validation
        if not re.search(r"\d", v):
            raise ValueError("Address must contain a street number")
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("Address must contain street name")
        return v


class PropertyUpdateRequest(StrictBaseModel):
    """Validated property update request"""
    
    address: Optional[str] = Field(default=None, min_length=10, max_length=200)
    bedrooms: Optional[int] = Field(default=None, ge=0, le=20)
    bathrooms: Optional[int] = Field(default=None, ge=1, le=20)
    sqft: Optional[int] = Field(default=None, ge=100, le=50000)
    has_pets: Optional[bool] = None
    access_instructions: Optional[str] = Field(default=None, max_length=500)


# ============================================
# Job/Booking Validation Models
# ============================================

class JobCreateRequest(StrictBaseModel):
    """Validated job creation request"""
    
    property_id: str = Field(min_length=1)
    service_type: Literal["standard", "deep", "move_in", "move_out", "turnover", "custom"]
    scheduled_date: date
    scheduled_time: time
    estimated_hours: float = Field(ge=1, le=24)
    urgency: Literal["normal", "urgent", "flexible"] = "normal"
    special_requests: Optional[str] = Field(default=None, max_length=2000)
    preferred_cleaner_id: Optional[str] = None
    
    @model_validator(mode="after")
    def validate_scheduling(self):
        # Ensure scheduled date is not in the past
        today = date.today()
        if self.scheduled_date < today:
            raise ValueError("Cannot schedule jobs in the past")
        
        # Urgent jobs must be within 24 hours
        if self.urgency == "urgent":
            from datetime import timedelta
            if self.scheduled_date > today + timedelta(days=1):
                raise ValueError("Urgent jobs must be scheduled within 24 hours")
        
        return self


class JobUpdateRequest(StrictBaseModel):
    """Validated job update request"""
    
    status: Optional[Literal["pending", "confirmed", "in_progress", "completed", "cancelled"]] = None
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[time] = None
    special_requests: Optional[str] = Field(default=None, max_length=2000)
    cancellation_reason: Optional[str] = Field(default=None, max_length=500)
    
    @model_validator(mode="after")
    def validate_cancellation(self):
        if self.status == "cancelled" and not self.cancellation_reason:
            raise ValueError("Cancellation reason is required when cancelling a job")
        return self


# ============================================
# Payment Validation Models
# ============================================

class PaymentCreateRequest(StrictBaseModel):
    """Validated payment creation request"""
    
    job_id: str = Field(min_length=1)
    amount: float = Field(gt=0, le=10000)
    currency: Literal["usd", "eur", "gbp", "cad"] = "usd"
    payment_method_id: str = Field(min_length=1)
    tip_amount: Optional[float] = Field(default=None, ge=0, le=1000)
    
    @field_validator("amount", "tip_amount")
    @classmethod
    def validate_currency_precision(cls, v: Optional[float]) -> Optional[float]:
        if v is None:
            return v
        # Round to 2 decimal places
        return round(v, 2)


# ============================================
# Message Validation Models
# ============================================

class MessageCreateRequest(StrictBaseModel):
    """Validated message creation request"""
    
    recipient_id: str = Field(min_length=1)
    content: str = Field(min_length=1, max_length=5000)
    
    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        # Remove excessive whitespace
        v = re.sub(r"\s+", " ", v).strip()
        if len(v) < 1:
            raise ValueError("Message cannot be empty")
        return v


# ============================================
# Review Validation Models
# ============================================

class ReviewCreateRequest(StrictBaseModel):
    """Validated review creation request"""
    
    job_id: str = Field(min_length=1)
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=2000)
    
    @field_validator("comment")
    @classmethod
    def validate_comment(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        # Filter out profanity (simplified)
        prohibited = ["spam", "fake", "scam"]
        lower_v = v.lower()
        for word in prohibited:
            if word in lower_v:
                raise ValueError("Review contains prohibited content")
        return v


# ============================================
# Search/Filter Validation Models
# ============================================

class SearchFilters(StrictBaseModel):
    """Validated search filters"""
    
    query: Optional[str] = Field(default=None, max_length=200)
    service_type: Optional[Literal["standard", "deep", "move_in", "move_out", "turnover", "custom"]] = None
    min_rating: Optional[float] = Field(default=None, ge=1, le=5)
    max_price: Optional[float] = Field(default=None, gt=0)
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    sort_by: Literal["rating", "price", "distance", "availability"] = "rating"
    sort_order: Literal["asc", "desc"] = "desc"
    page: int = Field(ge=1, default=1)
    limit: int = Field(ge=1, le=100, default=20)
    
    @model_validator(mode="after")
    def validate_date_range(self):
        if self.date_from and self.date_to:
            if self.date_from > self.date_to:
                raise ValueError("date_from must be before date_to")
        return self


# ============================================
# Cleaner Profile Validation
# ============================================

class CleanerProfileUpdate(StrictBaseModel):
    """Validated cleaner profile update"""
    
    bio: Optional[str] = Field(default=None, max_length=2000)
    hourly_rate: Optional[float] = Field(default=None, ge=15, le=500)
    service_radius_miles: Optional[int] = Field(default=None, ge=1, le=100)
    services_offered: Optional[List[str]] = Field(default=None, max_length=10)
    available_days: Optional[List[Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]]] = None
    available_start_time: Optional[time] = None
    available_end_time: Optional[time] = None
    
    @model_validator(mode="after")
    def validate_availability(self):
        if self.available_start_time and self.available_end_time:
            if self.available_start_time >= self.available_end_time:
                raise ValueError("Start time must be before end time")
        return self
