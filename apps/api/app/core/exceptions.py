"""
BookACleaner API Exceptions
Standardized error handling for all API endpoints
"""

from fastapi import HTTPException, status
from typing import Any, Dict, Optional


class APIError(HTTPException):
    """Base API error with standardized format"""
    
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        self.error_code = error_code
        self.details = details or {}
        super().__init__(
            status_code=status_code,
            detail={
                "error": error_code,
                "message": message,
                "details": self.details
            }
        )


class NotFoundError(APIError):
    """Resource not found (404)"""
    
    def __init__(self, resource: str, identifier: Any = None):
        details = {"resource": resource}
        if identifier:
            details["id"] = str(identifier)
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            message=f"{resource} not found",
            details=details
        )


class ValidationError(APIError):
    """Request validation failed (422)"""
    
    def __init__(self, message: str, field: Optional[str] = None, details: Optional[Dict] = None):
        error_details = details or {}
        if field:
            error_details["field"] = field
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            message=message,
            details=error_details
        )


class AuthenticationError(APIError):
    """Authentication failed (401)"""
    
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTHENTICATION_REQUIRED",
            message=message
        )


class AuthorizationError(APIError):
    """Authorization failed (403)"""
    
    def __init__(self, message: str = "Permission denied"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="PERMISSION_DENIED",
            message=message
        )


class ConflictError(APIError):
    """Resource conflict (409)"""
    
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
            message=message,
            details=details
        )


class RateLimitError(APIError):
    """Rate limit exceeded (429)"""
    
    def __init__(self, retry_after: int = 60):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
            message="Too many requests. Please try again later.",
            details={"retry_after_seconds": retry_after}
        )


class ServiceUnavailableError(APIError):
    """External service unavailable (503)"""
    
    def __init__(self, service: str, message: str = "Service temporarily unavailable"):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="SERVICE_UNAVAILABLE",
            message=message,
            details={"service": service}
        )


class PaymentError(APIError):
    """Payment processing failed (402)"""
    
    def __init__(self, message: str, stripe_error: Optional[str] = None):
        details = {}
        if stripe_error:
            details["stripe_error"] = stripe_error
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            error_code="PAYMENT_FAILED",
            message=message,
            details=details
        )


class BadRequestError(APIError):
    """Generic bad request (400)"""
    
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="BAD_REQUEST",
            message=message,
            details=details
        )
