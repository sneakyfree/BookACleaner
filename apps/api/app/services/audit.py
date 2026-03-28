"""
Audit Snapshot Service
Creates immutable decision snapshots for compliance and reproducibility
Implements DNA Strand's Compliance Spine audit trail requirements
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from enum import Enum
import uuid
import hashlib
import json
import logging

logger = logging.getLogger(__name__)


class SnapshotType(str, Enum):
    """Types of decisions that require audit snapshots"""
    PRICING = "pricing"
    VERIFICATION = "verification"
    PAYOUT = "payout"
    DISPUTE = "dispute"
    BACKGROUND_CHECK = "background_check"
    JOB_ASSIGNMENT = "job_assignment"
    TIER_CHANGE = "tier_change"
    ACCOUNT_ACTION = "account_action"


class DataSource(BaseModel):
    """Source of a data point in the snapshot"""
    field: str
    value: Any
    source_type: str  # "verified", "stated", "estimated", "calculated"
    source_id: Optional[str] = None
    timestamp: Optional[datetime] = None


class AuditSnapshot(BaseModel):
    """Immutable snapshot of a decision for audit trail"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: SnapshotType
    
    # Entity information
    entity_type: str
    entity_id: str
    
    # Decision details
    decision: str
    decision_value: Any
    decision_rationale: str
    
    # Input data with provenance
    inputs: List[DataSource]
    
    # Actor information
    made_by: str  # "system", "user:{id}", "admin:{id}"
    requested_by: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Integrity
    checksum: Optional[str] = None
    parent_snapshot_id: Optional[str] = None  # For decision chains
    
    # Context
    context: Dict[str, Any] = Field(default_factory=dict)
    
    def compute_checksum(self) -> str:
        """Compute SHA-256 checksum of snapshot data"""
        data = {
            "id": self.id,
            "type": self.type.value,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "decision": self.decision,
            "decision_value": str(self.decision_value),
            "inputs": [i.model_dump() for i in self.inputs],
            "made_by": self.made_by,
            "created_at": self.created_at.isoformat(),
        }
        json_str = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(json_str.encode()).hexdigest()


# In-memory storage for demo (replace with immutable DB in production)
_snapshots: Dict[str, AuditSnapshot] = {}


class AuditService:
    """
    Service for creating and managing audit snapshots.
    Implements DNA Strand's Compliance Spine requirements.
    """
    
    @staticmethod
    def create_snapshot(
        type: SnapshotType,
        entity_type: str,
        entity_id: str,
        decision: str,
        decision_value: Any,
        decision_rationale: str,
        inputs: List[DataSource],
        made_by: str,
        requested_by: Optional[str] = None,
        context: Optional[Dict] = None,
        parent_snapshot_id: Optional[str] = None,
    ) -> AuditSnapshot:
        """Create an immutable audit snapshot"""
        
        snapshot = AuditSnapshot(
            type=type,
            entity_type=entity_type,
            entity_id=entity_id,
            decision=decision,
            decision_value=decision_value,
            decision_rationale=decision_rationale,
            inputs=inputs,
            made_by=made_by,
            requested_by=requested_by,
            context=context or {},
            parent_snapshot_id=parent_snapshot_id,
        )
        
        # Compute integrity checksum
        snapshot.checksum = snapshot.compute_checksum()
        
        # Store snapshot
        _snapshots[snapshot.id] = snapshot
        
        logger.info(
            f"Audit snapshot created: {snapshot.id} "
            f"type={type.value} entity={entity_type}:{entity_id}"
        )
        
        return snapshot
    
    @staticmethod
    def get_snapshot(snapshot_id: str) -> Optional[AuditSnapshot]:
        """Retrieve a snapshot by ID"""
        return _snapshots.get(snapshot_id)
    
    @staticmethod
    def verify_snapshot(snapshot_id: str) -> bool:
        """Verify snapshot integrity"""
        snapshot = _snapshots.get(snapshot_id)
        if not snapshot:
            return False
        
        computed = snapshot.compute_checksum()
        return computed == snapshot.checksum
    
    @staticmethod
    def get_entity_snapshots(
        entity_type: str,
        entity_id: str,
        snapshot_type: Optional[SnapshotType] = None,
    ) -> List[AuditSnapshot]:
        """Get all snapshots for an entity"""
        results = []
        for snapshot in _snapshots.values():
            if snapshot.entity_type == entity_type and snapshot.entity_id == entity_id:
                if snapshot_type is None or snapshot.type == snapshot_type:
                    results.append(snapshot)
        
        return sorted(results, key=lambda s: s.created_at, reverse=True)
    
    @staticmethod
    def create_pricing_snapshot(
        job_id: str,
        final_price: float,
        components: List[Dict],
        made_by: str,
    ) -> AuditSnapshot:
        """Convenience method for pricing decisions"""
        
        inputs = [
            DataSource(
                field=c["name"],
                value=c["amount"],
                source_type="calculated",
            )
            for c in components
        ]
        
        return AuditService.create_snapshot(
            type=SnapshotType.PRICING,
            entity_type="job",
            entity_id=job_id,
            decision="price_calculated",
            decision_value=final_price,
            decision_rationale=f"Price calculated from {len(components)} components",
            inputs=inputs,
            made_by=made_by,
            context={"components": components},
        )
    
    @staticmethod
    def create_verification_snapshot(
        cleaner_id: str,
        tier: int,
        checks: Dict[str, str],
        made_by: str,
    ) -> AuditSnapshot:
        """Convenience method for verification decisions"""
        
        inputs = [
            DataSource(
                field=check_name,
                value=status,
                source_type="verified" if status == "passed" else "stated",
            )
            for check_name, status in checks.items()
        ]
        
        passed = sum(1 for s in checks.values() if s == "passed")
        total = len(checks)
        
        return AuditService.create_snapshot(
            type=SnapshotType.VERIFICATION,
            entity_type="cleaner",
            entity_id=cleaner_id,
            decision="tier_assigned",
            decision_value=tier,
            decision_rationale=f"Tier {tier} based on {passed}/{total} checks passed",
            inputs=inputs,
            made_by=made_by,
            context={"checks_summary": {"passed": passed, "total": total}},
        )


# Singleton instance
audit_service = AuditService()
