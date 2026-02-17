"""
SQLAlchemy Models for BookACleaner.ai
Persistent database schema matching the DNA Strand Master Plan
"""
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, 
    ForeignKey, Enum, JSON, create_engine
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import enum

Base = declarative_base()


# ==================== ENUMS ====================

class UserRole(str, enum.Enum):
    CLIENT = "client"
    CLEANER = "cleaner"
    ADMIN = "admin"


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    AUTHORIZED = "authorized"
    HELD = "held"
    CAPTURED = "captured"
    RELEASED = "released"
    TRANSFERRED = "transferred"
    REFUNDED = "refunded"
    FAILED = "failed"
    DISPUTED = "disputed"


class BidStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    WITHDRAWN = "withdrawn"


class DisputeStatus(str, enum.Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    CLOSED = "closed"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BANNED = "banned"


class SubscriptionPlan(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    PREMIUM = "premium"


class FlagReason(str, enum.Enum):
    SPAM = "spam"
    INAPPROPRIATE = "inappropriate"
    HARASSMENT = "harassment"
    FRAUD = "fraud"
    OTHER = "other"


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPIRED = "expired"


class VerificationType(str, enum.Enum):
    EMAIL = "email"
    PHONE = "phone"
    ID = "id"
    BUSINESS_LICENSE = "business_license"
    INSURANCE = "insurance"
    IICRC = "iicrc"
    EPA = "epa"
    OSHA = "osha"
    BACKGROUND_CHECK = "background_check"


# ==================== MODELS ====================

def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(20), default="client")
    full_name = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    status = Column(String(20), default="active")
    is_verified = Column(Boolean, default=False)
    email_verified_at = Column(DateTime, nullable=True)
    phone_verified_at = Column(DateTime, nullable=True)
    refresh_token = Column(String(255), nullable=True)
    refresh_token_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cleaner_profile = relationship("CleanerProfile", back_populates="user", uselist=False)
    client_profile = relationship("ClientProfile", back_populates="user", uselist=False)
    verifications = relationship("Verification", back_populates="user")
    password_resets = relationship("PasswordReset", back_populates="user")
    notifications = relationship("Notification", back_populates="user")


class CleanerProfile(Base):
    __tablename__ = "cleaner_profiles"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True)
    business_name = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    hourly_rate = Column(Float, default=0.0)
    verification_tier = Column(Integer, default=1)
    stripe_account_id = Column(String(255), nullable=True)
    
    # Stats
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    completed_jobs = Column(Integer, default=0)
    on_time_rate = Column(Float, default=0.0)
    response_time_minutes = Column(Integer, nullable=True)
    repeat_client_rate = Column(Float, default=0.0)
    
    # Services and areas (JSON arrays)
    services = Column(JSON, default=list)
    service_areas = Column(JSON, default=list)
    
    profile_photo = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="cleaner_profile")
    jobs = relationship("Job", back_populates="cleaner")
    certifications = relationship("Certification", back_populates="cleaner")


class ClientProfile(Base):
    __tablename__ = "client_profiles"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True)
    display_name = Column(String(255), nullable=True)
    verification_tier = Column(Integer, default=1)
    stripe_customer_id = Column(String(255), nullable=True)
    
    # Stats
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    jobs_posted = Column(Integer, default=0)
    jobs_completed = Column(Integer, default=0)
    on_time_payment_rate = Column(Float, default=100.0)
    
    profile_photo = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="client_profile")
    properties = relationship("Property", back_populates="client")
    jobs = relationship("Job", back_populates="client")


class Property(Base):
    __tablename__ = "properties"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    client_id = Column(String(36), ForeignKey("client_profiles.id"))
    
    name = Column(String(255), nullable=True)
    address = Column(String(500), nullable=False)
    address_line_2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(50), nullable=True)
    zip_code = Column(String(20), nullable=True)
    country = Column(String(50), default="US")
    
    # Property details
    property_type = Column(String(50), nullable=True)
    sqft = Column(Integer, nullable=True)
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Float, nullable=True)
    year_built = Column(Integer, nullable=True)
    
    # Preferences
    access_info = Column(Text, nullable=True)
    special_notes = Column(Text, nullable=True)
    
    # Airbnb sync
    airbnb_calendar_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("ClientProfile", back_populates="properties")
    jobs = relationship("Job", back_populates="property")


class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    client_id = Column(String(36), ForeignKey("client_profiles.id"))
    cleaner_id = Column(String(36), ForeignKey("cleaner_profiles.id"), nullable=True)
    property_id = Column(String(36), ForeignKey("properties.id"), nullable=True)
    
    # Details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    services = Column(JSON, default=list)
    
    # Schedule
    scheduled_date = Column(DateTime, nullable=True)
    scheduled_time = Column(String(10), nullable=True)
    estimated_hours = Column(Float, nullable=True)
    
    # Pricing
    base_price = Column(Float, default=0.0)
    add_on_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)
    
    # Status
    status = Column(String(20), default="pending")
    payment_status = Column(String(20), default="pending")
    
    # Payment
    stripe_payment_intent_id = Column(String(255), nullable=True)
    paid_at = Column(DateTime, nullable=True)
    paid_out_at = Column(DateTime, nullable=True)
    
    # Completion
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("ClientProfile", back_populates="jobs")
    cleaner = relationship("CleanerProfile", back_populates="jobs")
    property = relationship("Property", back_populates="jobs")
    reviews = relationship("Review", back_populates="job")
    messages = relationship("Message", back_populates="job")


class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("jobs.id"))
    author_id = Column(String(36), ForeignKey("users.id"))
    subject_id = Column(String(36), ForeignKey("users.id"))
    
    overall_rating = Column(Integer, nullable=False)
    category_ratings = Column(JSON, nullable=True)
    text = Column(Text, nullable=True)
    tags = Column(JSON, default=list)
    photos = Column(JSON, default=list)
    
    response = Column(Text, nullable=True)
    responded_at = Column(DateTime, nullable=True)
    
    revealed = Column(Boolean, default=False)
    is_public = Column(Boolean, default=True)
    moderated_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    job = relationship("Job", back_populates="reviews")


class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_message_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    messages = relationship("Message", back_populates="conversation")
    participants = relationship("ConversationParticipant", back_populates="conversation")


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id"))
    user_id = Column(String(36), ForeignKey("users.id"))
    last_read_at = Column(DateTime, nullable=True)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="participants")


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id"))
    sender_id = Column(String(36), ForeignKey("users.id"))
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=True)
    
    content = Column(Text, nullable=False)
    attachments = Column(JSON, default=list)
    channel = Column(String(20), default="app")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    job = relationship("Job", back_populates="messages")


class Verification(Base):
    __tablename__ = "verifications"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    
    type = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")
    
    document_url = Column(String(500), nullable=True)
    extracted_data = Column(JSON, nullable=True)
    
    verified_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="verifications")


class Certification(Base):
    __tablename__ = "certifications"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    cleaner_id = Column(String(36), ForeignKey("cleaner_profiles.id"))
    
    type = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    issuer = Column(String(255), nullable=True)
    cert_number = Column(String(100), nullable=True)
    issued_date = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    document_url = Column(String(500), nullable=True)
    verified = Column(Boolean, default=False)
    verified_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cleaner = relationship("CleanerProfile", back_populates="certifications")


class PasswordReset(Base):
    __tablename__ = "password_resets"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    token = Column(String(100), nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="password_resets")


class EmailVerification(Base):
    __tablename__ = "email_verifications"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    token = Column(String(100), nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PhoneVerification(Base):
    __tablename__ = "phone_verifications"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    phone = Column(String(20), nullable=False)
    code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"))
    
    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    data = Column(JSON, nullable=True)
    
    read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="notifications")


class Bid(Base):
    __tablename__ = "bids"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=False)
    cleaner_id = Column(String(36), ForeignKey("cleaner_profiles.id"), nullable=False)
    
    amount = Column(Float, nullable=False)
    message = Column(Text, nullable=True)
    estimated_hours = Column(Float, nullable=True)
    status = Column(String(20), default="pending")
    
    accepted_at = Column(DateTime, nullable=True)
    declined_at = Column(DateTime, nullable=True)
    withdrawn_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Badge(Base):
    __tablename__ = "badges"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String(500), nullable=True)
    criteria_type = Column(String(50), nullable=False)  # review_count, avg_rating, job_count, tier, etc.
    criteria_value = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class UserBadge(Base):
    __tablename__ = "user_badges"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    badge_id = Column(String(36), ForeignKey("badges.id"), nullable=False)
    awarded_at = Column(DateTime, default=datetime.utcnow)
    awarded_reason = Column(String(255), nullable=True)


class Dispute(Base):
    __tablename__ = "disputes"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=False)
    raised_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="open")
    resolution_notes = Column(Text, nullable=True)
    resolved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    stripe_subscription_id = Column(String(255), nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)
    
    plan = Column(String(20), default="free")
    status = Column(String(20), default="active")  # active, canceled, past_due
    
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FlaggedContent(Base):
    __tablename__ = "flagged_content"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    content_type = Column(String(20), nullable=False)  # review, message, feed
    content_id = Column(String(36), nullable=False)
    flagged_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    reason = Column(String(50), nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, reviewed, removed, dismissed
    
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class FeedItem(Base):
    __tablename__ = "feed_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    type = Column(String(50), nullable=False)  # announcement, tip, promo, feature, community
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    cta_text = Column(String(255), nullable=True)
    cta_url = Column(String(500), nullable=True)
    target_roles = Column(JSON, default=lambda: ["client", "cleaner"])
    priority = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    views = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class ApprovalQueueItem(Base):
    """Persistent storage for HITL approval requests"""
    __tablename__ = "approval_queue_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    type = Column(String(50), nullable=False)  # verification, payout, dispute, account_deletion, high_value_job, background_check
    entity_id = Column(String(36), nullable=False)
    entity_type = Column(String(50), nullable=False)
    requested_by = Column(String(36), nullable=True)
    reason = Column(Text, nullable=False)
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    context = Column(JSON, default=dict)
    status = Column(String(20), default="pending")  # pending, approved, rejected, expired
    expires_at = Column(DateTime, nullable=True)
    reviewed_by = Column(String(36), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SponsoredListing(Base):
    """Persistent storage for sponsored cleaner placements"""
    __tablename__ = "sponsored_listings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    cleaner_id = Column(String(36), ForeignKey("cleaner_profiles.id"), nullable=False)
    status = Column(String(20), default="active")  # active, expired, cancelled
    priority = Column(Integer, default=1)  # 1=standard, 2=premium, 3=featured
    duration_days = Column(Integer, default=30)
    starts_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    cleaner = relationship("CleanerProfile")


