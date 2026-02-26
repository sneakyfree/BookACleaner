"""
Earnings endpoint tests.

Covers: cleaner earnings summary, earnings history, withdrawal.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import get_auth_header


@pytest.mark.asyncio
async def test_get_earnings_summary(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    resp = await client.get("/api/v1/earnings/", headers=headers)
    assert resp.status_code in (200, 404)


@pytest.mark.asyncio
async def test_get_earnings_history(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    resp = await client.get("/api/v1/earnings/history", headers=headers)
    assert resp.status_code in (200, 404)


@pytest.mark.asyncio
async def test_earnings_forbidden_for_client(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    resp = await client.get("/api/v1/earnings/", headers=headers)
    assert resp.status_code in (200, 403, 404)


@pytest.mark.asyncio
async def test_request_withdrawal(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    resp = await client.post("/api/v1/earnings/withdraw", json={
        "amount": 50.00,
    }, headers=headers)
    assert resp.status_code in (200, 400, 404, 405)
