"""
OpenAI AI Service for BookACleaner.ai
Handles document parsing, chat assistance, and smart property detection
"""
import openai
from openai import AsyncOpenAI
import json
import base64
from typing import Optional, List, Dict, Any
import logging

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = AsyncOpenAI(api_key=settings.openai_api_key)


class AIService:
    """AI Service for document parsing, chat, and property detection"""
    
    def __init__(self):
        self.client = client
        self.model = "gpt-4o"
        self.vision_model = "gpt-4o"
    
    # ==================== DOCUMENT PARSING ====================
    
    async def parse_verification_document(
        self,
        image_url: str,
        document_type: str
    ) -> Dict[str, Any]:
        """
        Parse verification documents using GPT-4 Vision
        
        Args:
            image_url: URL to the document image
            document_type: One of 'business_license', 'insurance', 'certification', 'id'
        
        Returns:
            Extracted information from the document
        """
        prompts = {
            'business_license': """Analyze this business license document and extract:
1. Business name
2. License number
3. License type
4. Issue date
5. Expiration date
6. Issuing authority
7. Business address
8. Owner/Principal name

Return as JSON with these fields. If a field is not visible, use null.""",

            'insurance': """Analyze this insurance certificate and extract:
1. Insurance company name
2. Policy number
3. Coverage type (liability, workers comp, etc.)
4. Coverage amount
5. Effective date
6. Expiration date
7. Insured party name
8. Additional insureds (if any)

Return as JSON with these fields. If a field is not visible, use null.""",

            'certification': """Analyze this professional certification document and extract:
1. Certification name
2. Certification number
3. Certificate holder name
4. Issuing organization
5. Issue date
6. Expiration date (if applicable)
7. Certification level/type

Return as JSON with these fields. If a field is not visible, use null.""",

            'id': """Analyze this ID document and extract:
1. Full name
2. Document type (driver's license, passport, etc.)
3. Document number
4. Issue date
5. Expiration date
6. Date of birth (just confirm it exists, do not extract)
7. Address (if visible)

Return as JSON with these fields. If a field is not visible, use null.
DO NOT extract sensitive data like SSN or date of birth - just confirm they exist."""
        }
        
        prompt = prompts.get(document_type, prompts['id'])
        
        try:
            response = await self.client.chat.completions.create(
                model=self.vision_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a document verification specialist. Extract information accurately from documents. Always respond with valid JSON only."
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": image_url}}
                        ]
                    }
                ],
                max_tokens=1000,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return {
                "success": True,
                "document_type": document_type,
                "extracted_data": result,
                "confidence": "high" if len(result) > 3 else "low"
            }
            
        except Exception as e:
            logger.error(f"Document parsing error: {e}")
            return {"success": False, "error": str(e)}
    
    async def verify_document_authenticity(
        self,
        image_url: str,
        document_type: str
    ) -> Dict[str, Any]:
        """Check if a document appears authentic"""
        try:
            response = await self.client.chat.completions.create(
                model=self.vision_model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are a fraud detection specialist. Analyze documents for signs of tampering or forgery. Look for:
- Inconsistent fonts or text alignment
- Obvious photo manipulation
- Missing security features
- Blurry or pixelated official stamps/logos
- Mismatched or suspicious information

Be helpful but cautious. Flag concerns but don't make definitive fraud determinations."""
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": f"Analyze this {document_type} for potential issues. Return JSON with: is_valid (boolean), confidence (0-100), concerns (array of strings), recommendations (array of strings)"
                            },
                            {"type": "image_url", "image_url": {"url": image_url}}
                        ]
                    }
                ],
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return {"success": True, **result}
            
        except Exception as e:
            logger.error(f"Authenticity check error: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== AI CHAT ASSISTANT ====================
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        user_context: Optional[Dict[str, Any]] = None,
        role: str = "client"
    ) -> Dict[str, Any]:
        """
        AI chat assistant for booking help, Q&A, and support
        
        Args:
            messages: Conversation history
            user_context: Optional context about user/booking
            role: 'client' or 'cleaner' for personalized responses
        """
        system_prompt = f"""You are a helpful AI assistant for BookACleaner.ai, a professional cleaning services marketplace.

{'You are helping a client find and book cleaning services.' if role == 'client' else 'You are helping a professional cleaner manage their business.'}

Key information about BookACleaner.ai:
- Connects clients with verified cleaning professionals
- 5-tier verification system ensures trust
- Secure payments with money-back guarantee
- Easy booking and scheduling
- Real-time messaging between clients and cleaners

Your role:
1. Answer questions about the platform
2. Help with booking decisions
3. Provide cleaning tips and advice
4. Assist with account and billing questions
5. Escalate complex issues to human support

Be friendly, concise, and helpful. If you don't know something, admit it and suggest contacting support."""

        if user_context:
            system_prompt += f"\n\nUser context:\n{json.dumps(user_context, indent=2)}"
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    *messages
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            return {
                "success": True,
                "response": response.choices[0].message.content,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens
                }
            }
            
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return {"success": False, "error": str(e)}
    
    async def generate_cleaning_estimate(
        self,
        property_details: Dict[str, Any],
        services_requested: List[str]
    ) -> Dict[str, Any]:
        """Generate a smart cleaning estimate based on property details"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are a cleaning industry expert. Generate accurate price estimates based on property details and requested services.

Use these base rates (adjust based on property specifics):
- Standard Clean: $0.08-0.12 per sq ft
- Deep Clean: $0.15-0.25 per sq ft
- Move In/Out: $0.20-0.35 per sq ft
- Airbnb Turnover: $80-150 flat rate for <1500 sq ft, plus $0.05/sq ft after

Factors to consider:
- Square footage
- Number of bedrooms/bathrooms
- Property condition
- Location (urban areas +10-20%)
- Frequency discounts (weekly -15%, biweekly -10%)

Return JSON with: estimated_price, price_range (min/max), duration_hours, breakdown (array of line items), notes."""
                    },
                    {
                        "role": "user",
                        "content": f"Property: {json.dumps(property_details)}\nServices: {services_requested}"
                    }
                ],
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return {"success": True, **result}
            
        except Exception as e:
            logger.error(f"Estimate error: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== SMART PROPERTY DETECTION ====================
    
    async def detect_property_details(self, address: str) -> Dict[str, Any]:
        """
        Use AI to enhance property details from an address
        This would typically be combined with real estate APIs
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You help estimate property details from addresses. While you can't access real databases, provide realistic estimates based on:
- Address format (single family vs apartment)
- Location patterns
- Common property sizes for the area

Return JSON with: estimated_sqft, estimated_bedrooms, estimated_bathrooms, property_type (house/condo/apartment/townhouse), confidence (low/medium/high), notes."""
                    },
                    {
                        "role": "user",
                        "content": f"Estimate property details for: {address}"
                    }
                ],
                max_tokens=300,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return {"success": True, **result}
            
        except Exception as e:
            logger.error(f"Property detection error: {e}")
            return {"success": False, "error": str(e)}
    
    async def generate_job_summary(
        self,
        job_details: Dict[str, Any],
        before_photos: List[str] = [],
        after_photos: List[str] = []
    ) -> Dict[str, Any]:
        """Generate a professional job completion summary"""
        try:
            messages = [
                {
                    "role": "system",
                    "content": "Generate professional, concise job completion summaries for cleaning services. Focus on work completed and value delivered."
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"Generate a completion summary for this job:\n{json.dumps(job_details)}\n\nReturn JSON with: title, summary (2-3 sentences), highlights (array of key accomplishments), recommendations (array of maintenance tips)"
                        }
                    ]
                }
            ]
            
            # Add photos if provided
            if after_photos:
                messages[1]["content"].append({
                    "type": "text",
                    "text": "Here are the after photos:"
                })
                for photo in after_photos[:3]:  # Limit to 3 photos
                    messages[1]["content"].append({
                        "type": "image_url",
                        "image_url": {"url": photo}
                    })
            
            response = await self.client.chat.completions.create(
                model=self.vision_model if after_photos else self.model,
                messages=messages,
                max_tokens=400,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return {"success": True, **result}
            
        except Exception as e:
            logger.error(f"Summary generation error: {e}")
            return {"success": False, "error": str(e)}


# Create singleton instance
ai_service = AIService()
