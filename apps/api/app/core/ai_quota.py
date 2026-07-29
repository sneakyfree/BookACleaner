"""Per-user quota for the AI endpoints.

Every /api/v1/ai/* call spends money at OpenAI. The endpoints are all
authenticated, but authentication is not a spend limit: the global rate limiter
allowed 60 requests/minute, which is 86,400 GPT-4o calls per day per client —
and it keys on IP, so users behind one NAT shared a budget while anyone with
rotating IPs had none.

Two limits, because they do different jobs:

  * a short burst limit, which stops a runaway client or a retry loop
  * a DAILY quota, which is the only one that actually bounds the bill

Both are keyed by user id (falling back to IP for unauthenticated callers) and
are configurable, so the numbers here are a safe default rather than a policy
decision baked into code.

Counters live in Redis when it is reachable, so they are shared across workers
and survive a restart. If Redis is down the in-process fallback still enforces
a limit for this worker rather than failing open — a cache outage must not
become an unmetered spend window.
"""
import logging
import os
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional

from fastapi import Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.cache import cache

logger = logging.getLogger(__name__)


def _int_env(name: str, default: int) -> int:
    try:
        return max(0, int(os.getenv(name, str(default))))
    except (TypeError, ValueError):
        logger.warning("Invalid %s; falling back to %s", name, default)
        return default


# Deliberately generous for a person, deliberately tight against a loop.
# A human using the assistant conversationally will not notice these.
AI_REQUESTS_PER_MINUTE = _int_env("AI_REQUESTS_PER_MINUTE", 10)
AI_REQUESTS_PER_DAY = _int_env("AI_REQUESTS_PER_DAY", 200)

# 0 disables a limit, for load testing or a deliberately unmetered deployment.
_MINUTE_WINDOW_SECONDS = 60
_DAY_WINDOW_SECONDS = 86_400

# Fallback state, used only when Redis is unreachable.
_local_minute: Dict[str, Deque[float]] = defaultdict(deque)
_local_day: Dict[str, Deque[float]] = defaultdict(deque)


def _prune(bucket: Deque[float], window: int, now: float) -> None:
    cutoff = now - window
    while bucket and bucket[0] <= cutoff:
        bucket.popleft()


def _local_check(key: str, now: float) -> Optional[int]:
    """In-process enforcement. Returns retry_after seconds if blocked."""
    minute_bucket = _local_minute[key]
    day_bucket = _local_day[key]
    _prune(minute_bucket, _MINUTE_WINDOW_SECONDS, now)
    _prune(day_bucket, _DAY_WINDOW_SECONDS, now)

    if AI_REQUESTS_PER_DAY and len(day_bucket) >= AI_REQUESTS_PER_DAY:
        return int(_DAY_WINDOW_SECONDS - (now - day_bucket[0])) or 1
    if AI_REQUESTS_PER_MINUTE and len(minute_bucket) >= AI_REQUESTS_PER_MINUTE:
        return int(_MINUTE_WINDOW_SECONDS - (now - minute_bucket[0])) or 1

    minute_bucket.append(now)
    day_bucket.append(now)
    return None


async def _redis_incr(key: str, ttl: int) -> Optional[int]:
    """Increment a counter with a TTL. None when Redis is unavailable."""
    client = getattr(cache, "_client", None)
    if client is None:
        return None
    try:
        count = await client.incr(key)
        if count == 1:
            # Only the first writer sets the expiry, so the window is fixed
            # from first use rather than sliding forward on every request.
            await client.expire(key, ttl)
        return int(count)
    except Exception as exc:  # pragma: no cover - network dependent
        logger.warning("AI quota: Redis unavailable (%s); using local counter", exc)
        return None


def quota_identity(request: Request, user: Optional[dict]) -> str:
    """User id when authenticated, else the client IP.

    Per-user is the correct unit for a spend limit. IP-keying punished shared
    networks and did nothing about a single account behind many addresses.
    """
    if user and user.get("id"):
        return f"user:{user['id']}"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return f"ip:{forwarded.split(',')[0].strip()}"
    return f"ip:{request.client.host if request.client else 'unknown'}"


def _reject(scope: str, retry_after: int, limit: int) -> None:
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "error": "AI_QUOTA_EXCEEDED",
            "scope": scope,
            "limit": limit,
            "message": (
                f"AI request limit reached ({limit} per {scope}). "
                "Please try again later."
            ),
            "retry_after_seconds": retry_after,
        },
        headers={"Retry-After": str(retry_after)},
    )


async def enforce_ai_quota(
    request: Request,
    user=Depends(get_current_user),
) -> dict:
    """FastAPI dependency guarding the AI routes.

    Returns the authenticated user so routes can depend on this instead of
    get_current_user and keep a single dependency.
    """
    # Tests exercise the quota explicitly; leaving it on globally would make
    # every other AI test order-dependent.
    if os.getenv("TESTING", "").lower() == "true" and not os.getenv(
        "ENFORCE_AI_QUOTA_IN_TESTS"
    ):
        return user

    identity = quota_identity(request, user)
    now = time.time()

    day_count = await _redis_incr(f"ai:quota:day:{identity}", _DAY_WINDOW_SECONDS)
    if day_count is None:
        retry_after = _local_check(identity, now)
        if retry_after is not None:
            scope = (
                "day"
                if AI_REQUESTS_PER_DAY
                and len(_local_day[identity]) >= AI_REQUESTS_PER_DAY
                else "minute"
            )
            limit = AI_REQUESTS_PER_DAY if scope == "day" else AI_REQUESTS_PER_MINUTE
            logger.warning("AI quota exceeded (%s, local) for %s", scope, identity)
            _reject(scope, retry_after, limit)
        return user

    if AI_REQUESTS_PER_DAY and day_count > AI_REQUESTS_PER_DAY:
        logger.warning("AI daily quota exceeded for %s", identity)
        _reject("day", _DAY_WINDOW_SECONDS, AI_REQUESTS_PER_DAY)

    minute_count = await _redis_incr(
        f"ai:quota:min:{identity}", _MINUTE_WINDOW_SECONDS
    )
    if (
        minute_count is not None
        and AI_REQUESTS_PER_MINUTE
        and minute_count > AI_REQUESTS_PER_MINUTE
    ):
        logger.warning("AI per-minute quota exceeded for %s", identity)
        _reject("minute", _MINUTE_WINDOW_SECONDS, AI_REQUESTS_PER_MINUTE)

    return user
