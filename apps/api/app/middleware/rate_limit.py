"""
Rate Limiting Middleware
Implements request rate limiting to prevent abuse
"""

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple
import asyncio
import logging

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiting middleware.
    
    For production, use Redis-based rate limiting with sliding windows.
    """
    
    def __init__(
        self,
        app,
        requests_per_minute: int = 60,
        requests_per_hour: int = 1000,
        burst_limit: int = 10,
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.burst_limit = burst_limit
        
        # Store request counts: {client_key: [(timestamp, count), ...]}
        self._request_counts: Dict[str, list] = defaultdict(list)
        self._lock = asyncio.Lock()
        
        # Endpoint-specific limits (path pattern -> requests per minute)
        self.endpoint_limits = {
            "/api/v1/auth/login": 10,
            "/api/v1/auth/register": 5,
            "/api/v1/auth/forgot-password": 5,
            "/api/v1/auth/refresh": 10,
            "/api/v1/auth/oauth": 10,
            "/api/v1/payments": 30,
            "/api/v1/uploads": 20,
        }
    
    def _get_client_key(self, request: Request) -> str:
        """Get unique client identifier"""
        # Use X-Forwarded-For header if behind proxy
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        # Fall back to client host
        return request.client.host if request.client else "unknown"
    
    def _get_endpoint_limit(self, path: str) -> int:
        """Get rate limit for specific endpoint"""
        for pattern, limit in self.endpoint_limits.items():
            if path.startswith(pattern):
                return limit
        return self.requests_per_minute
    
    async def _cleanup_old_entries(self, client_key: str) -> None:
        """Remove entries older than 1 hour"""
        cutoff = datetime.utcnow() - timedelta(hours=1)
        self._request_counts[client_key] = [
            (ts, count) for ts, count in self._request_counts[client_key]
            if ts > cutoff
        ]
    
    async def _check_rate_limit(
        self,
        client_key: str,
        path: str,
    ) -> Tuple[bool, int, int]:
        """
        Check if request is within rate limits.
        
        Returns: (is_allowed, remaining, retry_after)
        """
        async with self._lock:
            await self._cleanup_old_entries(client_key)
            
            now = datetime.utcnow()
            minute_ago = now - timedelta(minutes=1)
            hour_ago = now - timedelta(hours=1)
            
            entries = self._request_counts[client_key]
            
            # Count requests in last minute
            minute_count = sum(
                count for ts, count in entries
                if ts > minute_ago
            )
            
            # Count requests in last hour
            hour_count = sum(
                count for ts, count in entries
            )
            
            # Get endpoint-specific limit
            endpoint_limit = self._get_endpoint_limit(path)
            
            # Check limits
            if minute_count >= endpoint_limit:
                retry_after = 60 - (now - minute_ago).seconds
                return False, 0, max(retry_after, 1)
            
            if hour_count >= self.requests_per_hour:
                retry_after = 3600 - (now - hour_ago).seconds
                return False, 0, max(retry_after, 1)
            
            # Record this request
            entries.append((now, 1))
            
            remaining = min(
                endpoint_limit - minute_count - 1,
                self.requests_per_hour - hour_count - 1,
            )
            
            return True, max(remaining, 0), 0
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and docs
        if request.url.path in ["/health", "/", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
        
        # Skip rate limiting during test runs
        import os
        if os.getenv("TESTING", "").lower() == "true":
            return await call_next(request)
        
        client_key = self._get_client_key(request)
        path = request.url.path
        
        is_allowed, remaining, retry_after = await self._check_rate_limit(
            client_key, path
        )
        
        if not is_allowed:
            logger.warning(
                f"Rate limit exceeded for {client_key} on {path}"
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests. Please try again later.",
                    "retry_after_seconds": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(60)
        
        return response


class SlowDownMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds artificial delay for suspicious clients.
    Useful for slowing down potential attackers.
    """
    
    def __init__(self, app, threshold: int = 100, delay_ms: int = 500):
        super().__init__(app)
        self.threshold = threshold
        self.delay_ms = delay_ms
        self._request_counts: Dict[str, int] = defaultdict(int)
    
    async def dispatch(self, request: Request, call_next):
        client_key = request.client.host if request.client else "unknown"
        
        self._request_counts[client_key] += 1
        
        if self._request_counts[client_key] > self.threshold:
            await asyncio.sleep(self.delay_ms / 1000)
        
        return await call_next(request)
