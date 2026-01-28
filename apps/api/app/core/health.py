"""
Deep Health Check Endpoint
Comprehensive health monitoring with dependency checks
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Optional, Literal
from datetime import datetime
import asyncio
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])


class DependencyHealth(BaseModel):
    """Health status of a single dependency"""
    name: str
    status: Literal["healthy", "degraded", "unhealthy"]
    latency_ms: Optional[float] = None
    message: Optional[str] = None


class HealthResponse(BaseModel):
    """Comprehensive health check response"""
    status: Literal["healthy", "degraded", "unhealthy"]
    version: str
    environment: str
    timestamp: str
    uptime_seconds: float
    dependencies: Dict[str, DependencyHealth]


# Track startup time for uptime calculation
_startup_time = datetime.utcnow()


async def check_database_health() -> DependencyHealth:
    """Check database connectivity"""
    try:
        from app.database import get_db
        import time
        
        start = time.perf_counter()
        # Simple query to verify connection
        db = await get_db().__anext__()
        # Execute a simple query
        await db.execute("SELECT 1")
        latency = (time.perf_counter() - start) * 1000
        
        return DependencyHealth(
            name="database",
            status="healthy",
            latency_ms=round(latency, 2),
        )
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        return DependencyHealth(
            name="database",
            status="unhealthy",
            message=str(e)[:100],
        )


async def check_redis_health() -> DependencyHealth:
    """Check Redis connectivity (if configured)"""
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        return DependencyHealth(
            name="redis",
            status="healthy",
            message="Not configured (using in-memory)",
        )
    
    try:
        import aioredis
        import time
        
        start = time.perf_counter()
        redis = await aioredis.from_url(redis_url)
        await redis.ping()
        await redis.close()
        latency = (time.perf_counter() - start) * 1000
        
        return DependencyHealth(
            name="redis",
            status="healthy",
            latency_ms=round(latency, 2),
        )
    except ImportError:
        return DependencyHealth(
            name="redis",
            status="healthy",
            message="Redis client not installed",
        )
    except Exception as e:
        logger.warning(f"Redis health check failed: {e}")
        return DependencyHealth(
            name="redis",
            status="unhealthy",
            message=str(e)[:100],
        )


async def check_stripe_health() -> DependencyHealth:
    """Check Stripe API connectivity"""
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe_key:
        return DependencyHealth(
            name="stripe",
            status="healthy",
            message="Not configured (mock mode)",
        )
    
    try:
        import stripe
        import time
        
        stripe.api_key = stripe_key
        start = time.perf_counter()
        # Simple API call to verify connectivity
        stripe.Balance.retrieve()
        latency = (time.perf_counter() - start) * 1000
        
        return DependencyHealth(
            name="stripe",
            status="healthy",
            latency_ms=round(latency, 2),
        )
    except ImportError:
        return DependencyHealth(
            name="stripe",
            status="healthy",
            message="Stripe client not installed",
        )
    except Exception as e:
        logger.warning(f"Stripe health check failed: {e}")
        return DependencyHealth(
            name="stripe",
            status="degraded",
            message=str(e)[:100],
        )


async def check_email_health() -> DependencyHealth:
    """Check email service configuration"""
    sendgrid_key = os.getenv("SENDGRID_API_KEY")
    if not sendgrid_key:
        return DependencyHealth(
            name="email",
            status="healthy",
            message="Not configured (mock mode)",
        )
    
    return DependencyHealth(
        name="email",
        status="healthy",
        message="SendGrid configured",
    )


@router.get("/health", response_model=HealthResponse)
async def deep_health_check():
    """
    Comprehensive health check with dependency status.
    
    Returns overall health status based on dependency health:
    - healthy: All dependencies are healthy
    - degraded: Some non-critical dependencies are unhealthy
    - unhealthy: Critical dependencies are unhealthy
    """
    # Run all health checks concurrently
    checks = await asyncio.gather(
        check_database_health(),
        check_redis_health(),
        check_stripe_health(),
        check_email_health(),
        return_exceptions=True,
    )
    
    # Process results
    dependencies = {}
    for check in checks:
        if isinstance(check, Exception):
            logger.error(f"Health check exception: {check}")
            continue
        dependencies[check.name] = check
    
    # Determine overall status
    statuses = [d.status for d in dependencies.values()]
    
    if "unhealthy" in statuses:
        # Check if critical dependency is unhealthy
        db_status = dependencies.get("database", DependencyHealth(name="database", status="unknown"))
        if db_status.status == "unhealthy":
            overall_status = "unhealthy"
        else:
            overall_status = "degraded"
    elif "degraded" in statuses:
        overall_status = "degraded"
    else:
        overall_status = "healthy"
    
    # Calculate uptime
    uptime = (datetime.utcnow() - _startup_time).total_seconds()
    
    return HealthResponse(
        status=overall_status,
        version=os.getenv("APP_VERSION", "0.1.0"),
        environment=os.getenv("ENVIRONMENT", "development"),
        timestamp=datetime.utcnow().isoformat(),
        uptime_seconds=round(uptime, 2),
        dependencies=dependencies,
    )


@router.get("/health/live")
async def liveness_probe():
    """
    Kubernetes liveness probe.
    Returns 200 if the application is running.
    """
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness_probe():
    """
    Kubernetes readiness probe.
    Returns 200 if the application is ready to receive traffic.
    """
    # Check critical dependencies
    db_health = await check_database_health()
    
    if db_health.status == "unhealthy":
        return {"status": "not_ready", "reason": "database unavailable"}
    
    return {"status": "ready"}
