"""
Service Agreements API for BookACleaner.ai
Click-to-accept agreement system for job bookings
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Request, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import logging

from app.database import get_db
from app.config import get_settings
from app.api.deps import get_current_user

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


# ==================== SCHEMAS ====================

class AcceptAgreementRequest(BaseModel):
    job_id: str
    agreement_type: str = "service"  # service, cancellation, liability


class AgreementResponse(BaseModel):
    id: str
    job_id: str
    user_id: str
    role: str
    agreement_type: str
    version: str
    accepted: bool
    accepted_at: Optional[str] = None
    created_at: Optional[str] = None


# ==================== AGREEMENT TEMPLATES ====================

AGREEMENT_TEMPLATES = {
    "service": {
        "title": "Service Agreement",
        "version": "1.0",
        "content": """
## BookACleaner Service Agreement

By accepting this agreement, both parties agree to the following terms:

### For Clients:
1. **Payment**: You agree to pay the quoted amount for the cleaning services described in this booking. Payment is held in escrow until the job is confirmed as complete.
2. **Access**: You agree to provide reasonable access to the property at the scheduled time, including any entry instructions.
3. **Property Condition**: You agree to disclose any hazardous conditions, pets, or special requirements before the cleaning begins.
4. **Cancellation**: Cancellations made less than 24 hours before the scheduled time may incur a cancellation fee of up to 50% of the quoted amount.
5. **Satisfaction Guarantee**: If you are not satisfied with the service, you may file a dispute within 48 hours of job completion.

### For Cleaners:
1. **Service Quality**: You agree to perform the cleaning services as described in the booking to a professional standard.
2. **Timeliness**: You agree to arrive within the scheduled time window and complete the job within the estimated duration.
3. **Insurance**: You confirm that you carry adequate liability insurance covering any damage that may occur during the cleaning.
4. **Confidentiality**: You agree to maintain the privacy of client property details, entry codes, and personal information.
5. **Payment**: Payment will be released to your account within 2 business days of job completion confirmation.

### Mutual Terms:
- Both parties agree to communicate respectfully and address any issues through the BookACleaner platform.
- BookACleaner acts as a facilitator and is not liable for the quality of services or property conditions.
- Disputes will be handled through BookACleaner's resolution process.

**This agreement is effective upon acceptance by both parties and applies to the specific booking referenced.**
        """.strip(),
    },
    "cancellation": {
        "title": "Cancellation Policy",
        "version": "1.0",
        "content": """
## Cancellation Policy

- **48+ hours before**: Full refund
- **24-48 hours before**: 75% refund
- **Under 24 hours**: 50% refund
- **No-show**: No refund; cleaner receives 50% payment

By accepting, you acknowledge and agree to this cancellation policy for the referenced booking.
        """.strip(),
    },
    "liability": {
        "title": "Liability Waiver",
        "version": "1.0",
        "content": """
## Liability Waiver

By accepting this waiver, you acknowledge:

1. BookACleaner is a platform connecting clients with independent cleaning professionals.
2. Cleaners are independent contractors, not employees of BookACleaner.
3. BookACleaner is not liable for property damage, personal injury, or loss of belongings.
4. All cleaners on the platform carry their own liability insurance.
5. Any claims for damages should be filed through the BookACleaner dispute resolution process within 48 hours.
        """.strip(),
    },
}


# ==================== AUTH HELPER ====================
@router.get("/templates/{agreement_type}")
async def get_agreement_template(agreement_type: str):
    """Get agreement template text by type"""
    template = AGREEMENT_TEMPLATES.get(agreement_type)
    if not template:
        raise HTTPException(status_code=404, detail=f"Agreement type '{agreement_type}' not found")

    return {
        "type": agreement_type,
        "title": template["title"],
        "version": template["version"],
        "content": template["content"],
    }


@router.get("/templates")
async def list_agreement_templates():
    """List all available agreement templates"""
    return [
        {"type": k, "title": v["title"], "version": v["version"]}
        for k, v in AGREEMENT_TEMPLATES.items()
    ]


@router.post("/")
async def accept_agreement(
    data: AcceptAgreementRequest,
    request: Request,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Accept a service agreement for a job"""

    # Verify job exists
    job = await db.job.find_unique(where={"id": data.job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Verify user is a party to this job
    role = user.get("role", "client")
    if role == "client" and job.get("client_id") != user["id"]:
        raise HTTPException(status_code=403, detail="You are not the client for this job")

    # Check if already accepted
    existing = await db.service_agreement.find_many(where={
        "job_id": data.job_id,
        "user_id": user["id"],
        "agreement_type": data.agreement_type,
    })
    if existing:
        return {
            "message": "Agreement already accepted",
            "agreement": existing[0],
        }

    # Get template version
    template = AGREEMENT_TEMPLATES.get(data.agreement_type, {})

    # Create agreement record
    agreement = await db.service_agreement.create(data={
        "job_id": data.job_id,
        "user_id": user["id"],
        "role": role,
        "agreement_type": data.agreement_type,
        "version": template.get("version", "1.0"),
        "accepted": True,
        "accepted_at": datetime.now(timezone.utc),
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    })

    return {
        "message": "Agreement accepted",
        "agreement": agreement,
    }


@router.get("/job/{job_id}")
async def get_job_agreements(
    job_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get all agreements for a job"""

    job = await db.job.find_unique(where={"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    agreements = await db.service_agreement.find_many(where={"job_id": job_id})

    # Enrich with user info
    enriched = []
    for a in agreements:
        u = await db.user.find_unique(where={"id": a.get("user_id")})
        enriched.append({
            **a,
            "user_name": u.get("full_name") if u else "Unknown",
            "user_email": u.get("email") if u else None,
        })

    # Check if both parties have signed
    roles_signed = {a.get("role") for a in agreements}
    both_signed = "client" in roles_signed and "cleaner" in roles_signed

    return {
        "agreements": enriched,
        "both_signed": both_signed,
        "total": len(agreements),
    }


@router.get("/my")
async def get_my_agreements(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get all agreements for the current user"""

    agreements = await db.service_agreement.find_many(where={"user_id": user["id"]})
    agreements.sort(key=lambda x: x.get("created_at") or "", reverse=True)

    # Paginate
    start = (page - 1) * limit
    paginated = agreements[start:start + limit]

    # Enrich with job info
    enriched = []
    for a in paginated:
        job = await db.job.find_unique(where={"id": a.get("job_id")})
        enriched.append({
            **a,
            "job_title": job.get("title") if job else None,
            "job_status": job.get("status") if job else None,
        })

    return {
        "agreements": enriched,
        "total": len(agreements),
        "page": page,
        "limit": limit,
    }
