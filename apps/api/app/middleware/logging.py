"""
Structured Logging Middleware
Provides JSON logging with request tracing and performance metrics
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime
import uuid
import time
import logging
import json
from typing import Optional

logger = logging.getLogger(__name__)


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
        # Generate unique request ID
        request_id = str(uuid.uuid4())[:8]
        
        # Store in request state for access in handlers
        request.state.request_id = request_id
        
        # Record start time
        start_time = time.perf_counter()
        
        # Get client info
        client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if not client_ip and request.client:
            client_ip = request.client.host
        
        # Log request
        log_data = {
            "event": "request_started",
            "request_id": request_id,
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
            
            # Log response
            log_data = {
                "event": "request_completed",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code if response else 500,
                "duration_ms": round(duration_ms, 2),
                "timestamp": datetime.utcnow().isoformat(),
            }
            
            if error:
                log_data["error"] = error
            
            # Log slow requests as warnings
            if duration_ms > self.slow_request_threshold_ms:
                log_data["slow_request"] = True
                logger.warning(json.dumps(log_data))
            else:
                logger.info(json.dumps(log_data))
        
        # Add request ID to response headers
        if response:
            response.headers["X-Request-ID"] = request_id
        
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
