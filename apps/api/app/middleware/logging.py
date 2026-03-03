"""
Structured Logging Middleware
Provides JSON logging with request tracing, performance metrics,
correlation IDs, and user context for production observability.
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime
import uuid
import time
import logging
import json
import os
from typing import Optional

logger = logging.getLogger(__name__)

_SERVICE = "bookacleaner-api"
_ENV = os.getenv("ENVIRONMENT", "development")
_VERSION = os.getenv("APP_VERSION", "0.1.0")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs all requests with structured JSON format.
    Adds request ID for distributed tracing.
    """
    
    def __init__(self, app, log_body: bool = False, slow_request_threshold_ms: int = 1000):
        super().__init__(app)
        self.log_body = log_body
        self.slow_request_threshold_ms = slow_request_threshold_ms
    
    async def dispatch(self, request: Request, call_next):
        # Correlation ID: propagate from upstream or generate new
        correlation_id = request.headers.get("x-correlation-id") or str(uuid.uuid4())
        request_id = str(uuid.uuid4())[:8]
        
        # Store in request state for access in handlers and async jobs
        request.state.request_id = request_id
        request.state.correlation_id = correlation_id
        
        # Extract user_id from Authorization header (best-effort, no validation)
        user_id = None
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                import base64
                token = auth_header.split(" ")[1]
                payload_b64 = token.split(".")[1] + "=="
                payload = json.loads(base64.urlsafe_b64decode(payload_b64))
                user_id = payload.get("sub")
            except Exception:
                pass  # Best-effort extraction, don't block request
        
        # Record start time
        start_time = time.perf_counter()
        
        # Get client info
        client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if not client_ip and request.client:
            client_ip = request.client.host
        
        # Log request start
        log_data = {
            "event": "request_started",
            "service": _SERVICE,
            "env": _ENV,
            "version": _VERSION,
            "request_id": request_id,
            "correlation_id": correlation_id,
            "user_id": user_id,
            "method": request.method,
            "path": request.url.path,
            "query": str(request.query_params) if request.query_params else None,
            "client_ip": client_ip,
            "user_agent": request.headers.get("user-agent", "")[:100],
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        logger.info(json.dumps(log_data))
        
        # Process request
        response = None
        error = None
        try:
            response = await call_next(request)
        except Exception as e:
            error = str(e)
            raise
        finally:
            # Calculate duration
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            status_code = response.status_code if response else 500
            
            # Record metrics
            try:
                from app.core.metrics import record_request
                record_request(request.url.path, status_code, duration_ms / 1000)
            except Exception:
                pass  # Don't break request if metrics fail
            
            # Log response
            log_data = {
                "event": "request_completed",
                "service": _SERVICE,
                "env": _ENV,
                "request_id": request_id,
                "correlation_id": correlation_id,
                "user_id": user_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "duration_ms": round(duration_ms, 2),
                "timestamp": datetime.utcnow().isoformat(),
            }
            
            if error:
                log_data["error_type"] = type(error).__name__ if not isinstance(error, str) else "Exception"
                log_data["error_message"] = str(error)[:200]  # Sanitized truncation
            
            # Log slow requests as warnings
            if duration_ms > self.slow_request_threshold_ms:
                log_data["slow_request"] = True
                logger.warning(json.dumps(log_data))
            else:
                logger.info(json.dumps(log_data))
        
        # Add tracing headers to response
        if response:
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Correlation-ID"] = correlation_id
        
        return response


def configure_logging(
    level: str = "INFO",
    json_format: bool = True,
    log_file: Optional[str] = None,
):
    """
    Configure application logging.
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR)
        json_format: Whether to use JSON format for logs
        log_file: Optional file path for log output
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))
    
    # Clear existing handlers
    root_logger.handlers = []
    
    # Create formatter
    if json_format:
        formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": %(message)s}'
        )
    else:
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (optional)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Suppress noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
