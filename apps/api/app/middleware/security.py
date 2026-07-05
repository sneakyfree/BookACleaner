"""
Security middleware for BookACleaner.ai
Adds security headers and global exception handler to prevent stack trace leaks.
"""
import logging
import traceback
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi import Request

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        # XSS protection (legacy, but still useful)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Permissions policy
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # Content Security Policy (API — restrict to JSON)
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        # Strict Transport Security (HTTPS only in production)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


class GlobalExceptionMiddleware(BaseHTTPMiddleware):
    """Catch unhandled exceptions and return clean JSON error responses.
    Never leak raw stack traces to API consumers."""

    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except StarletteHTTPException as exc:
            # Intentional HTTP errors raised from middleware (e.g. rate limiting)
            # carry a deliberate status code, detail, and headers. FastAPI's
            # exception handlers only cover route handlers, not middleware, so
            # these would otherwise be swallowed below and masked as a 500.
            # Pass them through with their real status code (429, etc.).
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
                headers=getattr(exc, "headers", None),
            )
        except Exception as exc:
            # Log the full traceback server-side
            logger.error(
                f"Unhandled exception on {request.method} {request.url.path}: "
                f"{exc.__class__.__name__}: {exc}\n{traceback.format_exc()}"
            )
            # Return a clean error to the client (no stack trace)
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "An internal error occurred. Please try again later.",
                    "error": exc.__class__.__name__,
                },
            )
