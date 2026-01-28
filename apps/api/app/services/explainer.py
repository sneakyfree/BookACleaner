"""
Explainability Service
Generates multi-layer explanations for decisions and pricing
Implements DNA Strand's 4-Layer Explainability framework
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ExplanationLayer(str, Enum):
    """The 4 layers of explanation per DNA Strand"""
    CLIENT = "client"           # Simple summary for end users
    ADMIN = "admin"             # Detailed breakdown for operators
    TECHNICAL = "technical"     # Full technical details
    AUDIT = "audit"             # Complete provenance for compliance


class ExplanationFactor(BaseModel):
    """A single factor contributing to a decision"""
    name: str
    description: str
    impact: Literal["positive", "negative", "neutral"]
    weight: float = Field(ge=0, le=1)
    value: Optional[Any] = None
    source: Optional[str] = None  # Where the data came from


class PriceComponent(BaseModel):
    """A component of the final price"""
    name: str
    description: str
    amount: float
    is_discount: bool = False
    formula: Optional[str] = None  # Technical explanation


class Explanation(BaseModel):
    """Multi-layer explanation for a decision or price"""
    entity_type: str
    entity_id: str
    decision_type: str
    
    # Layer-specific explanations
    client_summary: str
    client_factors: List[str]
    
    admin_summary: str
    admin_factors: List[ExplanationFactor]
    
    technical_summary: Optional[str] = None
    technical_factors: Optional[List[ExplanationFactor]] = None
    
    audit_snapshot_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # For pricing explanations
    price_components: Optional[List[PriceComponent]] = None
    final_amount: Optional[float] = None


class ExplainerService:
    """
    Service for generating multi-layer explanations.
    Implements DNA Strand's Explanatory Voice chromosome.
    """
    
    @staticmethod
    def explain_job_price(
        base_price: float,
        property_size: int,
        service_type: str,
        urgency: str = "normal",
        cleaner_tier: int = 3,
        discounts: Optional[List[Dict]] = None,
    ) -> Explanation:
        """Generate explanation for job pricing"""
        
        components = []
        factors = []
        client_factors = []
        
        # Base price
        components.append(PriceComponent(
            name="Base Service",
            description=f"{service_type} cleaning service",
            amount=base_price,
            formula=f"base_rate * property_size_factor"
        ))
        client_factors.append(f"Base rate for {service_type} cleaning")
        
        # Size factor
        size_factor = 1.0
        if property_size > 2000:
            size_factor = 1.3
            size_adjustment = base_price * 0.3
            components.append(PriceComponent(
                name="Large Property",
                description=f"Property over 2000 sq ft ({property_size} sq ft)",
                amount=size_adjustment,
                formula=f"base_price * 0.3 for properties > 2000 sq ft"
            ))
            client_factors.append("Larger property size")
            factors.append(ExplanationFactor(
                name="property_size",
                description=f"Property is {property_size} sq ft",
                impact="negative",
                weight=0.3,
                value=property_size,
                source="property_record"
            ))
        
        # Urgency factor
        urgency_multipliers = {
            "normal": 1.0,
            "soon": 1.15,
            "urgent": 1.3,
            "emergency": 1.5,
        }
        urgency_mult = urgency_multipliers.get(urgency, 1.0)
        if urgency_mult > 1.0:
            urgency_fee = base_price * (urgency_mult - 1)
            components.append(PriceComponent(
                name="Priority Scheduling",
                description=f"{urgency.title()} booking",
                amount=urgency_fee,
                formula=f"base_price * {urgency_mult - 1:.0%}"
            ))
            client_factors.append(f"Priority {urgency} scheduling")
            factors.append(ExplanationFactor(
                name="urgency",
                description=f"Booking urgency: {urgency}",
                impact="negative",
                weight=urgency_mult - 1,
                value=urgency,
                source="booking_request"
            ))
        
        # Cleaner tier bonus
        tier_bonuses = {1: 0, 2: 0.05, 3: 0.10, 4: 0.15, 5: 0.20}
        tier_bonus = tier_bonuses.get(cleaner_tier, 0)
        if tier_bonus > 0:
            tier_fee = base_price * tier_bonus
            components.append(PriceComponent(
                name="Premium Cleaner",
                description=f"Tier {cleaner_tier} verified cleaner",
                amount=tier_fee,
                formula=f"base_price * {tier_bonus:.0%}"
            ))
            client_factors.append(f"Tier {cleaner_tier} verified cleaner")
            factors.append(ExplanationFactor(
                name="cleaner_tier",
                description=f"Cleaner verification tier: {cleaner_tier}",
                impact="neutral",
                weight=tier_bonus,
                value=cleaner_tier,
                source="cleaner_profile"
            ))
        
        # Discounts
        if discounts:
            for discount in discounts:
                discount_amount = discount.get("amount", 0)
                components.append(PriceComponent(
                    name=discount.get("name", "Discount"),
                    description=discount.get("description", "Applied discount"),
                    amount=-discount_amount,
                    is_discount=True
                ))
                client_factors.append(f"Discount: {discount.get('name', 'Applied')}")
        
        # Calculate final
        final_amount = sum(c.amount for c in components)
        
        return Explanation(
            entity_type="job",
            entity_id="pending",
            decision_type="pricing",
            client_summary=f"Total: ${final_amount:.2f} for {service_type} cleaning",
            client_factors=client_factors,
            admin_summary=f"Price calculated from {len(components)} components with {len(factors)} modifying factors",
            admin_factors=factors,
            technical_summary=f"Price = Σ(components) where base={base_price}, size_factor={size_factor}, urgency={urgency_mult}",
            technical_factors=factors,
            price_components=components,
            final_amount=final_amount,
        )
    
    @staticmethod
    def explain_cleaner_match(
        cleaner_id: str,
        client_id: str,
        match_score: float,
        factors: Dict[str, float],
    ) -> Explanation:
        """Explain why a cleaner was matched/recommended"""
        
        explanation_factors = []
        client_factors = []
        
        # Convert factor scores to explanations
        factor_descriptions = {
            "proximity": "Located nearby",
            "rating": "Highly rated by clients",
            "availability": "Available at requested time",
            "specialization": "Specializes in your property type",
            "price": "Competitive pricing",
            "verification": "Fully verified",
        }
        
        for factor_name, score in factors.items():
            if score > 0.7:
                impact = "positive"
            elif score < 0.3:
                impact = "negative"
            else:
                impact = "neutral"
            
            explanation_factors.append(ExplanationFactor(
                name=factor_name,
                description=factor_descriptions.get(factor_name, factor_name),
                impact=impact,
                weight=score,
                value=score,
                source="matching_algorithm"
            ))
            
            if score > 0.5:
                client_factors.append(factor_descriptions.get(factor_name, factor_name))
        
        return Explanation(
            entity_type="cleaner_match",
            entity_id=cleaner_id,
            decision_type="recommendation",
            client_summary=f"Match score: {match_score:.0%}",
            client_factors=client_factors[:5],  # Top 5 for client
            admin_summary=f"Cleaner {cleaner_id} scored {match_score:.2f} across {len(factors)} factors",
            admin_factors=explanation_factors,
            technical_summary=f"weighted_avg({', '.join(f'{k}={v:.2f}' for k, v in factors.items())})",
            technical_factors=explanation_factors,
        )
    
    @staticmethod
    def explain_verification_decision(
        cleaner_id: str,
        tier: int,
        checks_passed: List[str],
        checks_failed: List[str],
        checks_pending: List[str],
    ) -> Explanation:
        """Explain verification tier assignment"""
        
        factors = []
        client_factors = []
        
        for check in checks_passed:
            factors.append(ExplanationFactor(
                name=check,
                description=f"{check} verified",
                impact="positive",
                weight=1.0,
                value="passed",
                source="verification_system"
            ))
            client_factors.append(f"✓ {check}")
        
        for check in checks_failed:
            factors.append(ExplanationFactor(
                name=check,
                description=f"{check} not verified",
                impact="negative",
                weight=0.0,
                value="failed",
                source="verification_system"
            ))
        
        for check in checks_pending:
            factors.append(ExplanationFactor(
                name=check,
                description=f"{check} pending review",
                impact="neutral",
                weight=0.5,
                value="pending",
                source="verification_system"
            ))
        
        tier_names = {1: "Starter", 2: "Verified", 3: "Professional", 4: "Certified", 5: "Elite"}
        
        return Explanation(
            entity_type="cleaner",
            entity_id=cleaner_id,
            decision_type="verification_tier",
            client_summary=f"Verification Tier: {tier} ({tier_names.get(tier, 'Unknown')})",
            client_factors=client_factors,
            admin_summary=f"Tier {tier} assigned: {len(checks_passed)} passed, {len(checks_failed)} failed, {len(checks_pending)} pending",
            admin_factors=factors,
            technical_summary=f"tier = min(5, floor(passed_count / required_per_tier))",
            technical_factors=factors,
        )


# Singleton instance
explainer = ExplainerService()
