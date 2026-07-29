"""
Redis Cache Module — P9
Async Redis client with dependency injection for FastAPI.
"""
import logging
from typing import Optional, Any
import json

logger = logging.getLogger(__name__)

# Try importing redis, graceful fallback if not installed
try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    aioredis = None  # type: ignore
    REDIS_AVAILABLE = False
    logger.warning("redis.asyncio not available — cache operations will be no-ops")


class CacheClient:
    """Async Redis cache wrapper with graceful fallback."""

    def __init__(self, redis_url: Optional[str] = None):
        self._client: Optional[Any] = None
        self._url = redis_url

    async def connect(self, redis_url: Optional[str] = None):
        url = redis_url or self._url
        if not url or not REDIS_AVAILABLE:
            logger.info("Cache: running in no-op mode (no Redis URL or library)")
            return
        try:
            self._client = aioredis.from_url(url, decode_responses=True)
            await self._client.ping()
            logger.info("Cache: connected to Redis")
        except Exception as e:
            logger.warning(f"Cache: Redis connection failed — {e}")
            self._client = None

    async def disconnect(self):
        if self._client:
            await self._client.close()
            self._client = None

    async def get(self, key: str) -> Optional[str]:
        if not self._client:
            return None
        try:
            return await self._client.get(key)
        except Exception:
            return None

    async def set(self, key: str, value: str, ttl: int = 300):
        if not self._client:
            return
        try:
            await self._client.set(key, value, ex=ttl)
        except Exception:
            pass

    async def claim(self, key: str, ttl: int = 86400) -> Optional[bool]:
        """Atomically claim a key. Returns True if this caller won the claim,
        False if it was already claimed, None if Redis is unavailable.

        This is SET NX — the check and the write are a single Redis operation,
        so concurrent workers cannot both win. Used for webhook idempotency,
        where a non-atomic get-then-set would let two simultaneous deliveries
        of the same event both pass the check and double-process.

        The None return is deliberately distinct from False: callers must be
        able to tell "already handled" from "dedup store is down".
        """
        if not self._client:
            return None
        try:
            return bool(await self._client.set(key, "1", ex=ttl, nx=True))
        except Exception:
            return None

    async def get_json(self, key: str) -> Optional[Any]:
        raw = await self.get(key)
        if raw:
            return json.loads(raw)
        return None

    async def set_json(self, key: str, value: Any, ttl: int = 300):
        await self.set(key, json.dumps(value), ttl)

    async def delete(self, key: str):
        if not self._client:
            return
        try:
            await self._client.delete(key)
        except Exception:
            pass

    async def invalidate_pattern(self, pattern: str):
        """Delete all keys matching a pattern."""
        if not self._client:
            return
        try:
            keys = []
            async for key in self._client.scan_iter(match=pattern):
                keys.append(key)
            if keys:
                await self._client.delete(*keys)
        except Exception:
            pass


# Global cache instance
cache = CacheClient()


async def get_cache() -> CacheClient:
    """FastAPI dependency for cache access."""
    return cache
