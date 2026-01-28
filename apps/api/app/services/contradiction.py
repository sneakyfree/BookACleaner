"""
Contradiction Detection Service
Identifies conflicting inputs during intake and booking flows
Implements DNA Strand's Intelligent Discovery contradiction detection
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date, time
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ContradictionSeverity(str, Enum):
    """Severity level of detected contradiction"""
    INFO = "info"           # Minor inconsistency, informational only
    WARNING = "warning"     # Potential issue, may want to verify
    ERROR = "error"         # Significant contradiction, must resolve
    BLOCKER = "blocker"     # Cannot proceed without resolution


class Contradiction(BaseModel):
    """A detected contradiction between inputs"""
    id: str
    severity: ContradictionSeverity
    field1: str
    field2: str
    message: str
    suggestion: Optional[str] = None
    auto_resolvable: bool = False
    resolved: bool = False
    resolved_by: Optional[str] = None


class ContradictionResult(BaseModel):
    """Result of contradiction detection"""
    has_contradictions: bool
    contradictions: List[Contradiction]
    blocker_count: int
    warning_count: int
    can_proceed: bool


class ContradictionDetector:
    """
    Detects logical contradictions in user input.
    Part of DNA Strand's Intelligent Discovery chromosome.
    """
    
    @staticmethod
    def detect_booking_contradictions(
        property_size: Optional[int],
        service_type: str,
        estimated_hours: Optional[float],
        scheduled_date: date,
        scheduled_time: time,
        urgency: str,
        special_requests: Optional[str],
    ) -> ContradictionResult:
        """Detect contradictions in booking request"""
        
        contradictions = []
        
        # Check 1: Property size vs estimated hours
        if property_size and estimated_hours:
            expected_hours = property_size / 500  # Rough estimate: 500 sq ft per hour
            if estimated_hours < expected_hours * 0.5:
                contradictions.append(Contradiction(
                    id=f"contra_size_hours_{datetime.now().timestamp()}",
                    severity=ContradictionSeverity.WARNING,
                    field1="property_size",
                    field2="estimated_hours",
                    message=f"Estimated {estimated_hours} hours seems short for {property_size} sq ft property",
                    suggestion=f"Consider {expected_hours:.1f}+ hours for thorough cleaning",
                ))
            elif estimated_hours > expected_hours * 2:
                contradictions.append(Contradiction(
                    id=f"contra_size_hours_{datetime.now().timestamp()}",
                    severity=ContradictionSeverity.INFO,
                    field1="property_size",
                    field2="estimated_hours",
                    message=f"Estimated {estimated_hours} hours is generous for {property_size} sq ft",
                    suggestion=f"Typical time is {expected_hours:.1f} hours",
                ))
        
        # Check 2: Urgency vs scheduled date
        today = date.today()
        days_until = (scheduled_date - today).days
        
        if urgency == "emergency" and days_until > 1:
            contradictions.append(Contradiction(
                id=f"contra_urgency_date_{datetime.now().timestamp()}",
                severity=ContradictionSeverity.WARNING,
                field1="urgency",
                field2="scheduled_date",
                message="Emergency urgency selected but booking is more than 24 hours away",
                suggestion="Consider 'urgent' or 'soon' urgency level instead",
                auto_resolvable=True,
            ))
        elif urgency == "normal" and days_until == 0:
            contradictions.append(Contradiction(
                id=f"contra_urgency_date_{datetime.now().timestamp()}",
                severity=ContradictionSeverity.INFO,
                field1="urgency",
                field2="scheduled_date",
                message="Same-day booking with normal urgency may have limited availability",
                suggestion="Consider 'soon' urgency for better matching",
            ))
        
        # Check 3: Service type vs special requests
        if special_requests:
            special_lower = special_requests.lower()
            
            if service_type == "standard" and any(word in special_lower for word in ["deep", "thorough", "detailed", "intensive"]):
                contradictions.append(Contradiction(
                    id=f"contra_service_special_{datetime.now().timestamp()}",
                    severity=ContradictionSeverity.WARNING,
                    field1="service_type",
                    field2="special_requests",
                    message="Standard cleaning selected but special requests suggest deep cleaning needed",
                    suggestion="Consider upgrading to 'deep' cleaning service",
                ))
            
            if service_type == "move_out" and "regular" in special_lower:
                contradictions.append(Contradiction(
                    id=f"contra_moveout_regular_{datetime.now().timestamp()}",
                    severity=ContradictionSeverity.ERROR,
                    field1="service_type",
                    field2="special_requests",
                    message="Move-out cleaning selected but requests mention regular/routine cleaning",
                    suggestion="Please clarify: Is this a move-out or regular cleaning?",
                ))
        
        # Check 4: Past date
        if scheduled_date < today:
            contradictions.append(Contradiction(
                id=f"contra_past_date_{datetime.now().timestamp()}",
                severity=ContradictionSeverity.BLOCKER,
                field1="scheduled_date",
                field2="current_date",
                message="Scheduled date is in the past",
                suggestion="Please select a future date",
            ))
        
        # Compile results
        blocker_count = len([c for c in contradictions if c.severity == ContradictionSeverity.BLOCKER])
        warning_count = len([c for c in contradictions if c.severity == ContradictionSeverity.WARNING])
        
        return ContradictionResult(
            has_contradictions=len(contradictions) > 0,
            contradictions=contradictions,
            blocker_count=blocker_count,
            warning_count=warning_count,
            can_proceed=blocker_count == 0,
        )
    
    @staticmethod
    def detect_profile_contradictions(
        profile_data: Dict[str, Any],
    ) -> ContradictionResult:
        """Detect contradictions in cleaner/client profile data"""
        
        contradictions = []
        
        # Check experience vs certifications
        experience_years = profile_data.get("experience_years", 0)
        certifications = profile_data.get("certifications", [])
        
        if experience_years < 1 and len(certifications) > 3:
            contradictions.append(Contradiction(
                id=f"contra_exp_certs_{datetime.now().timestamp()}",
                severity=ContradictionSeverity.INFO,
                field1="experience_years",
                field2="certifications",
                message="Many certifications listed for less than 1 year experience",
                suggestion="Please verify certification dates",
            ))
        
        # Check availability vs service areas
        availability_hours = profile_data.get("weekly_hours_available", 0)
        service_areas = profile_data.get("service_areas", [])
        
        if availability_hours < 10 and len(service_areas) > 5:
            contradictions.append(Contradiction(
                id=f"contra_avail_areas_{datetime.now().timestamp()}",
                severity=ContradictionSeverity.WARNING,
                field1="weekly_hours_available",
                field2="service_areas",
                message="Many service areas selected but limited availability",
                suggestion="Consider focusing on fewer areas for better service",
            ))
        
        # Compile results
        blocker_count = len([c for c in contradictions if c.severity == ContradictionSeverity.BLOCKER])
        warning_count = len([c for c in contradictions if c.severity == ContradictionSeverity.WARNING])
        
        return ContradictionResult(
            has_contradictions=len(contradictions) > 0,
            contradictions=contradictions,
            blocker_count=blocker_count,
            warning_count=warning_count,
            can_proceed=blocker_count == 0,
        )
    
    @staticmethod
    def detect_payment_contradictions(
        job_price: float,
        payment_amount: float,
        tip_amount: float,
        discount_applied: float,
    ) -> ContradictionResult:
        """Detect contradictions in payment data"""
        
        contradictions = []
        
        expected_total = job_price - discount_applied + tip_amount
        
        if abs(payment_amount - expected_total) > 0.01:
            contradictions.append(Contradiction(
                id=f"contra_payment_mismatch_{datetime.now().timestamp()}",
                severity=ContradictionSeverity.BLOCKER,
                field1="payment_amount",
                field2="calculated_total",
                message=f"Payment amount ${payment_amount:.2f} doesn't match expected ${expected_total:.2f}",
                suggestion="Please review the payment breakdown",
            ))
        
        if tip_amount < 0:
            contradictions.append(Contradiction(
                id=f"contra_negative_tip_{datetime.now().timestamp()}",
                severity=ContradictionSeverity.BLOCKER,
                field1="tip_amount",
                field2="valid_range",
                message="Tip amount cannot be negative",
                suggestion="Enter 0 for no tip",
            ))
        
        if discount_applied > job_price:
            contradictions.append(Contradiction(
                id=f"contra_discount_exceeds_{datetime.now().timestamp()}",
                severity=ContradictionSeverity.BLOCKER,
                field1="discount_applied",
                field2="job_price",
                message="Discount cannot exceed job price",
                suggestion="Please verify discount code",
            ))
        
        # Compile results
        blocker_count = len([c for c in contradictions if c.severity == ContradictionSeverity.BLOCKER])
        warning_count = len([c for c in contradictions if c.severity == ContradictionSeverity.WARNING])
        
        return ContradictionResult(
            has_contradictions=len(contradictions) > 0,
            contradictions=contradictions,
            blocker_count=blocker_count,
            warning_count=warning_count,
            can_proceed=blocker_count == 0,
        )


# Singleton instance
contradiction_detector = ContradictionDetector()
