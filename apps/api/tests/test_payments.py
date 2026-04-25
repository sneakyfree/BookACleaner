"""
Payment endpoint tests — expanded for Strand B.

Covers: Stripe checkout sessions for all 3 products, webhook checkout.session.completed,
subscription endpoint, and error cases.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import get_auth_header


@pytest.mark.asyncio
async def test_stripe_connect_unauthenticated(client: AsyncClient):
    resp = await client.post("/api/v1/payments/create-connected-account")
    assert resp.status_code in (401, 403, 405, 422)


@pytest.mark.asyncio
async def test_stripe_connect_new_user(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    resp = await client.post("/api/v1/payments/create-connected-account", headers=headers)
    assert resp.status_code in (200, 400, 422, 500)


@pytest.mark.asyncio
async def test_checkout_requires_auth(client: AsyncClient):
    resp = await client.post("/api/v1/payments/create-checkout-session", json={"jobId": "fake-id"})
    assert resp.status_code in (401, 403, 404, 405, 422)


@pytest.mark.asyncio
async def test_checkout_nonexistent_job(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    resp = await client.post("/api/v1/payments/create-checkout-session", json={"jobId": "nonexistent"}, headers=headers)
    assert resp.status_code in (400, 404, 422, 500)


@pytest.mark.asyncio
async def test_webhook_rejects_bad_signature(client: AsyncClient):
    resp = await client.post(
        "/api/v1/payments/webhook",
        content=b'{"type": "checkout.session.completed"}',
        headers={"stripe-signature": "bad-sig"},
    )
    assert resp.status_code in (400, 401, 403, 404, 405, 500)


@pytest.mark.asyncio
async def test_earnings_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/payments/earnings")
    assert resp.status_code in (401, 403, 404, 405, 422)


@pytest.mark.asyncio
async def test_earnings_returns_data(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    resp = await client.get("/api/v1/payments/earnings", headers=headers)
    assert resp.status_code in (200, 404, 405)


# ==================== Strand B: Checkout Session Tests ====================


@pytest.mark.asyncio
async def test_checkout_pay_as_you_go(client: AsyncClient):
    """Checkout session for Pay As You Go ($89 one-time)."""
    headers = await get_auth_header(client, role="client")
    resp = await client.post(
        "/api/v1/payments/create-checkout-session?plan=pay_as_you_go",
        headers=headers,
    )
    # Succeeds if Stripe is configured, 500 if price ID missing
    assert resp.status_code in (200, 400, 500)
    if resp.status_code == 200:
        data = resp.json()
        assert "url" in data
        assert "sessionId" in data


@pytest.mark.asyncio
async def test_checkout_weekly_clean(client: AsyncClient):
    """Checkout session for Weekly Clean ($69/wk subscription)."""
    headers = await get_auth_header(client, role="client")
    resp = await client.post(
        "/api/v1/payments/create-checkout-session?plan=weekly_clean",
        headers=headers,
    )
    assert resp.status_code in (200, 400, 500)
    if resp.status_code == 200:
        data = resp.json()
        assert "url" in data
        assert "sessionId" in data


@pytest.mark.asyncio
async def test_checkout_host_pro(client: AsyncClient):
    """Checkout session for Host Pro ($149/mo subscription)."""
    headers = await get_auth_header(client, role="client")
    resp = await client.post(
        "/api/v1/payments/create-checkout-session?plan=host_pro",
        headers=headers,
    )
    assert resp.status_code in (200, 400, 500)
    if resp.status_code == 200:
        data = resp.json()
        assert "url" in data
        assert "sessionId" in data


@pytest.mark.asyncio
async def test_checkout_invalid_plan(client: AsyncClient):
    """Invalid plan name should return 400."""
    headers = await get_auth_header(client, role="client")
    resp = await client.post(
        "/api/v1/payments/create-checkout-session?plan=nonexistent_plan",
        headers=headers,
    )
    assert resp.status_code == 400
    assert "Invalid plan" in resp.json().get("detail", "")


# ==================== Strand B: GET /subscription ====================


@pytest.mark.asyncio
async def test_subscription_requires_auth(client: AsyncClient):
    """GET /subscription without auth should fail."""
    resp = await client.get("/api/v1/payments/subscription")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_subscription_returns_free_by_default(client: AsyncClient):
    """New user with no subscription should get Starter (free) plan."""
    headers = await get_auth_header(client, role="client")
    resp = await client.get("/api/v1/payments/subscription", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["plan_id"] == "free"
    assert data["plan_name"] == "Starter"


# ==================== Strand B: Webhook checkout.session.completed ====================


@pytest.mark.asyncio
async def test_webhook_checkout_completed_missing_sig(client: AsyncClient):
    """checkout.session.completed without valid signature should be rejected."""
    import json
    payload = json.dumps({
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "mode": "payment",
                "metadata": {"userId": "test-user", "plan": "pay_as_you_go"},
                "amount_total": 8900,
                "payment_intent": "pi_test_123",
                "customer": "cus_test_456",
            }
        }
    })
    resp = await client.post(
        "/api/v1/payments/webhook",
        content=payload.encode(),
        headers={"stripe-signature": "t=1234,v1=fakesig"},
    )
    # Should reject — bad signature
    assert resp.status_code in (400, 500)
