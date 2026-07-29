from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging

from app.services.ai import ai_service
from app.core.feature_flags import flags
from app.api.deps import get_current_user
# Every route below spends money at OpenAI, so they depend on the quota guard
# rather than on get_current_user directly. enforce_ai_quota itself depends on
# get_current_user and returns the same user object, so handlers are unchanged.
from app.core.ai_quota import enforce_ai_quota

router = APIRouter()
logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_context: Optional[Dict[str, Any]] = None
    role: str = "client"  # 'client' or 'cleaner'


class ParseDocumentRequest(BaseModel):
    image_url: str
    document_type: str  # 'business_license', 'insurance', 'certification', 'id'


class EstimateRequest(BaseModel):
    property_details: Dict[str, Any]
    services: List[str]


class PropertyDetectRequest(BaseModel):
    address: str


class JobSummaryRequest(BaseModel):
    job_details: Dict[str, Any]
    before_photos: List[str] = []
    after_photos: List[str] = []


def _ai_unavailable(result: dict, operation: str) -> HTTPException:
    """Turn a failed AI call into an honest, non-leaky HTTP error.

    Two problems with the previous `HTTPException(500, detail=result["error"])`:

    1. 500 says WE crashed. An OpenAI outage or rate limit is an upstream
       dependency failure — 503 is the accurate code, it tells the client the
       request is worth retrying, and it stops third-party downtime showing up
       in our error budget as application faults.
    2. It returned the provider's raw error string to the caller. Those messages
       quote the credential back, e.g.
       "Incorrect API key provided: sk-audit********lder" — so a misconfigured
       key was disclosed to any authenticated user who triggered it.

    The detail is logged server-side and a generic message is returned.
    """
    logger.warning("AI %s failed: %s", operation, result.get("error"))
    return HTTPException(
        status_code=503,
        detail={
            "error": "AI_UNAVAILABLE",
            "operation": operation,
            "message": (
                "The AI service is temporarily unavailable. "
                "Please try again in a moment."
            ),
        },
    )


@router.post("/chat")
async def chat(data: ChatRequest, user=Depends(enforce_ai_quota)):
    """
    AI chat assistant for booking help and support
    
    Example:
    ```json
    {
        "messages": [
            {"role": "user", "content": "How do I book a deep clean?"}
        ],
        "role": "client"
    }
    ```
    """
    if not flags.ai_chat_enabled:
        raise HTTPException(status_code=503, detail="AI chat is temporarily disabled")

    messages = [{"role": m.role, "content": m.content} for m in data.messages]
    
    result = await ai_service.chat(
        messages=messages,
        user_context=data.user_context,
        role=data.role
    )
    
    if not result["success"]:
        raise _ai_unavailable(result, "chat")
    
    return result


@router.post("/parse-document")
async def parse_document(data: ParseDocumentRequest, user=Depends(enforce_ai_quota)):
    """
    Parse verification documents using AI Vision
    
    Document types:
    - business_license: Business license documents
    - insurance: Insurance certificates
    - certification: Professional certifications (IICRC, etc.)
    - id: Government ID (driver's license, passport)
    
    Returns extracted fields from the document.
    """
    if not flags.ai_document_parse_enabled:
        raise HTTPException(status_code=503, detail="AI document parsing is temporarily disabled")

    valid_types = ['business_license', 'insurance', 'certification', 'id']
    if data.document_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid document type. Must be one of: {valid_types}"
        )
    
    result = await ai_service.parse_verification_document(
        image_url=data.image_url,
        document_type=data.document_type
    )
    
    if not result["success"]:
        raise _ai_unavailable(result, "document_parse")
    
    return result


@router.post("/verify-document")
async def verify_document(data: ParseDocumentRequest, user=Depends(enforce_ai_quota)):
    """
    Check document authenticity using AI analysis
    
    Returns:
    - is_valid: Boolean indicating if document appears authentic
    - confidence: 0-100 confidence score
    - concerns: List of potential issues found
    - recommendations: Suggested next steps
    """
    if not flags.ai_document_parse_enabled:
        raise HTTPException(status_code=503, detail="AI document verification is temporarily disabled")

    result = await ai_service.verify_document_authenticity(
        image_url=data.image_url,
        document_type=data.document_type
    )
    
    if not result["success"]:
        raise _ai_unavailable(result, "document_verify")
    
    return result


@router.post("/estimate")
async def generate_estimate(data: EstimateRequest, user=Depends(enforce_ai_quota)):
    """
    Generate smart cleaning estimate based on property details
    
    Example:
    ```json
    {
        "property_details": {
            "sqft": 2200,
            "bedrooms": 4,
            "bathrooms": 2.5,
            "type": "house",
            "condition": "normal"
        },
        "services": ["deep_clean"]
    }
    ```
    
    Returns estimated price, duration, and line-item breakdown.
    """
    result = await ai_service.generate_cleaning_estimate(
        property_details=data.property_details,
        services_requested=data.services
    )
    
    if not result["success"]:
        raise _ai_unavailable(result, "estimate")
    
    return result


@router.post("/detect-property")
async def detect_property(data: PropertyDetectRequest, user=Depends(enforce_ai_quota)):
    """
    Detect property details from address using AI
    
    This supplements real estate API data with AI estimations.
    Returns estimated sqft, bedrooms, bathrooms, and property type.
    """
    result = await ai_service.detect_property_details(data.address)
    
    if not result["success"]:
        raise _ai_unavailable(result, "property_detect")
    
    return result


@router.post("/job-summary")
async def generate_job_summary(data: JobSummaryRequest, user=Depends(enforce_ai_quota)):
    """
    Generate professional job completion summary
    
    Can analyze before/after photos to describe work completed.
    Returns title, summary, highlights, and maintenance recommendations.
    """
    result = await ai_service.generate_job_summary(
        job_details=data.job_details,
        before_photos=data.before_photos,
        after_photos=data.after_photos
    )
    
    if not result["success"]:
        raise _ai_unavailable(result, "job_summary")
    
    return result
