from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.services.ai import ai_service
from app.core.feature_flags import flags

router = APIRouter()


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


@router.post("/chat")
async def chat(data: ChatRequest):
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
        raise HTTPException(status_code=500, detail=result.get("error", "Chat failed"))
    
    return result


@router.post("/parse-document")
async def parse_document(data: ParseDocumentRequest):
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
        raise HTTPException(status_code=500, detail=result.get("error", "Parsing failed"))
    
    return result


@router.post("/verify-document")
async def verify_document(data: ParseDocumentRequest):
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
        raise HTTPException(status_code=500, detail=result.get("error", "Verification failed"))
    
    return result


@router.post("/estimate")
async def generate_estimate(data: EstimateRequest):
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
        raise HTTPException(status_code=500, detail=result.get("error", "Estimate failed"))
    
    return result


@router.post("/detect-property")
async def detect_property(data: PropertyDetectRequest):
    """
    Detect property details from address using AI
    
    This supplements real estate API data with AI estimations.
    Returns estimated sqft, bedrooms, bathrooms, and property type.
    """
    result = await ai_service.detect_property_details(data.address)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Detection failed"))
    
    return result


@router.post("/job-summary")
async def generate_job_summary(data: JobSummaryRequest):
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
        raise HTTPException(status_code=500, detail=result.get("error", "Summary failed"))
    
    return result
