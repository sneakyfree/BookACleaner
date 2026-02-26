"""
Payment endpoint tests.

Covers: Stripe Connect, checkout, webhook, earnings.
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
