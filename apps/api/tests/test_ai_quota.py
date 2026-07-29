"""Per-user AI spend quota.

Every /api/v1/ai/* call bills OpenAI. Authentication is not a spend limit: the
global limiter allowed 60 requests/minute, i.e. 86,400 GPT-4o calls per day per
client, keyed on IP so shared networks competed while one account behind many
addresses was unbounded.

The quota is disabled under TESTING by default (otherwise every other AI test
becomes order-dependent), so these tests opt it back in explicitly via
ENFORCE_AI_QUOTA_IN_TESTS and reset the counters between cases.
"""
import os
from unittest.mock import AsyncMock, patch

import pytest

from app.core import ai_quota
from tests.money_helpers import make_user


@pytest.fixture
def enforced(monkeypatch):
    """Turn the quota on for this test and clear its counters."""
    monkeypatch.setenv("ENFORCE_AI_QUOTA_IN_TESTS", "1")
    ai_quota._local_minute.clear()
    ai_quota._local_day.clear()
    # Force the in-process path so a shared Redis from another test run cannot
    # carry counts across cases.
    monkeypatch.setattr(ai_quota, "_redis_incr", AsyncMock(return_value=None))
    yield
    ai_quota._local_minute.clear()
    ai_quota._local_day.clear()


@pytest.fixture
def tight_limits(monkeypatch):
    """Small limits so tests do not have to make 200 calls."""
    monkeypatch.setattr(ai_quota, "AI_REQUESTS_PER_MINUTE", 3)
    monkeypatch.setattr(ai_quota, "AI_REQUESTS_PER_DAY", 5)


def _stub_estimate():
    return patch(
        "app.services.ai.ai_service.generate_cleaning_estimate",
        new=AsyncMock(return_value={"success": True, "estimated_price": 100}),
    )


async def _call(client, headers):
    return await client.post(
        "/api/v1/ai/estimate",
        json={"property_details": {"sqft": 1000}, "services": ["standard"]},
        headers=headers,
    )


# ── the limit actually bites ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_burst_beyond_the_minute_limit_is_rejected(client, enforced, tight_limits):
    headers, _, _ = await make_user(client, "client")

    with _stub_estimate() as stub:
        allowed = []
        for _ in range(ai_quota.AI_REQUESTS_PER_MINUTE):
            allowed.append((await _call(client, headers)).status_code)
        blocked = await _call(client, headers)

    assert all(code == 200 for code in allowed), allowed
    assert blocked.status_code == 429, blocked.text
    detail = blocked.json()["detail"]
    assert detail["error"] == "AI_QUOTA_EXCEEDED"
    assert detail["scope"] == "minute"
    # The blocked call must not have reached OpenAI.
    assert stub.await_count == ai_quota.AI_REQUESTS_PER_MINUTE


@pytest.mark.asyncio
async def test_daily_quota_bounds_total_spend(client, enforced, monkeypatch):
    """Per-minute alone does not cap cost; the daily quota is what does.

    Minute limit is set high here so only the daily cap can trigger.
    """
    monkeypatch.setattr(ai_quota, "AI_REQUESTS_PER_MINUTE", 0)  # disabled
    monkeypatch.setattr(ai_quota, "AI_REQUESTS_PER_DAY", 4)

    headers, _, _ = await make_user(client, "client")

    with _stub_estimate() as stub:
        for _ in range(4):
            assert (await _call(client, headers)).status_code == 200
        blocked = await _call(client, headers)

    assert blocked.status_code == 429, blocked.text
    assert blocked.json()["detail"]["scope"] == "day"
    assert blocked.json()["detail"]["limit"] == 4
    assert stub.await_count == 4, "a blocked request still called OpenAI"


@pytest.mark.asyncio
async def test_429_tells_the_client_when_to_retry(client, enforced, tight_limits):
    headers, _, _ = await make_user(client, "client")
    with _stub_estimate():
        for _ in range(ai_quota.AI_REQUESTS_PER_MINUTE):
            await _call(client, headers)
        blocked = await _call(client, headers)

    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers
    assert int(blocked.headers["Retry-After"]) > 0
    assert blocked.json()["detail"]["retry_after_seconds"] > 0


# ── the quota is per user, not per IP ─────────────────────────────────────


@pytest.mark.asyncio
async def test_one_users_usage_does_not_block_another(client, enforced, tight_limits):
    """IP-keying made users on a shared network compete for one budget."""
    heavy_h, _, _ = await make_user(client, "client")
    light_h, _, _ = await make_user(client, "client")

    with _stub_estimate():
        for _ in range(ai_quota.AI_REQUESTS_PER_MINUTE):
            await _call(client, heavy_h)
        assert (await _call(client, heavy_h)).status_code == 429

        # Different user, same IP — must be unaffected.
        assert (await _call(client, light_h)).status_code == 200


@pytest.mark.asyncio
async def test_identity_prefers_user_over_ip():
    """A single account cannot escape its quota by changing address."""
    from starlette.datastructures import Headers

    class Req:
        def __init__(self, ip, fwd=None):
            self.headers = Headers({"x-forwarded-for": fwd} if fwd else {})
            self.client = type("C", (), {"host": ip})()

    user = {"id": "user-123"}
    a = ai_quota.quota_identity(Req("1.1.1.1"), user)
    b = ai_quota.quota_identity(Req("2.2.2.2", "9.9.9.9"), user)
    assert a == b == "user:user-123"

    # Unauthenticated callers still get an identity, from the address.
    anon = ai_quota.quota_identity(Req("3.3.3.3"), None)
    assert anon == "ip:3.3.3.3"


@pytest.mark.asyncio
async def test_forwarded_header_is_used_for_anonymous_callers():
    from starlette.datastructures import Headers

    class Req:
        headers = Headers({"x-forwarded-for": "5.5.5.5, 10.0.0.1"})
        client = type("C", (), {"host": "127.0.0.1"})()

    assert ai_quota.quota_identity(Req(), None) == "ip:5.5.5.5"


# ── failure modes ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_quota_still_enforced_when_redis_is_down(client, enforced, tight_limits):
    """A cache outage must not become an unmetered spend window."""
    # `enforced` already forces _redis_incr to return None (Redis unavailable).
    headers, _, _ = await make_user(client, "client")

    with _stub_estimate():
        for _ in range(ai_quota.AI_REQUESTS_PER_MINUTE):
            assert (await _call(client, headers)).status_code == 200
        blocked = await _call(client, headers)

    assert blocked.status_code == 429, (
        "with Redis down the quota failed open — that is an unmetered bill"
    )


@pytest.mark.asyncio
async def test_zero_disables_a_limit(client, enforced, monkeypatch):
    """0 must mean 'no limit', for load testing or a deliberate choice."""
    monkeypatch.setattr(ai_quota, "AI_REQUESTS_PER_MINUTE", 0)
    monkeypatch.setattr(ai_quota, "AI_REQUESTS_PER_DAY", 0)

    headers, _, _ = await make_user(client, "client")
    with _stub_estimate():
        for _ in range(8):
            assert (await _call(client, headers)).status_code == 200


def test_invalid_env_falls_back_to_a_safe_default(monkeypatch):
    """A typo in configuration must not disable the guard."""
    monkeypatch.setenv("AI_REQUESTS_PER_DAY", "not-a-number")
    assert ai_quota._int_env("AI_REQUESTS_PER_DAY", 200) == 200

    monkeypatch.setenv("AI_REQUESTS_PER_DAY", "-5")
    assert ai_quota._int_env("AI_REQUESTS_PER_DAY", 200) == 0  # clamped, explicit


@pytest.mark.asyncio
async def test_quota_applies_to_every_ai_route(client, enforced, monkeypatch):
    """A new AI route must not silently bypass the quota."""
    monkeypatch.setattr(ai_quota, "AI_REQUESTS_PER_MINUTE", 1)
    monkeypatch.setattr(ai_quota, "AI_REQUESTS_PER_DAY", 0)

    headers, _, _ = await make_user(client, "client")

    with patch(
        "app.services.ai.ai_service.chat",
        new=AsyncMock(return_value={"success": True, "message": "hi"}),
    ):
        first = await client.post(
            "/api/v1/ai/chat",
            json={"messages": [{"role": "user", "content": "hello"}]},
            headers=headers,
        )
        second = await client.post(
            "/api/v1/ai/chat",
            json={"messages": [{"role": "user", "content": "hi again"}]},
            headers=headers,
        )

    assert first.status_code == 200, first.text
    assert second.status_code == 429, "the /ai/chat route is not behind the quota"


@pytest.mark.asyncio
async def test_unauthenticated_calls_are_still_rejected_before_the_quota(client):
    """Auth remains the first gate; the quota is not a substitute for it."""
    resp = await client.post(
        "/api/v1/ai/estimate",
        json={"property_details": {}, "services": []},
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_quota_is_off_by_default_under_testing(client):
    """Without the opt-in, the suite must not trip over the quota."""
    assert os.getenv("TESTING", "").lower() == "true"
    assert not os.getenv("ENFORCE_AI_QUOTA_IN_TESTS")

    headers, _, _ = await make_user(client, "client")
    with _stub_estimate():
        for _ in range(12):  # comfortably past the real 10/min default
            assert (await _call(client, headers)).status_code == 200
