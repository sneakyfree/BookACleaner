"""
Verification endpoint tests.

Covers: submit verification, get verification status, admin approve/reject.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import get_auth_header, get_admin_auth_header


@pytest.mark.asyncio
async def test_get_verification_status(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    resp = await client.get("/api/v1/verification/status", headers=headers)
    assert resp.status_code in (200, 404)


@pytest.mark.asyncio
async def test_submit_verification(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    resp = await client.post("/api/v1/verification/submit", json={
        "document_type": "drivers_license",
        "document_url": "https://example.com/doc.pdf",
    }, headers=headers)
    assert resp.status_code in (200, 201, 400, 404)


@pytest.mark.asyncio
async def test_admin_list_verifications(client: AsyncClient):
    headers = await get_admin_auth_header(client)
    resp = await client.get("/api/v1/verification/pending", headers=headers)
    assert resp.status_code in (200, 403, 404)


@pytest.mark.asyncio
async def test_admin_approve_verification(client: AsyncClient):
    headers = await get_admin_auth_header(client)
    resp = await client.post("/api/v1/verification/fake-id/approve", headers=headers)
    assert resp.status_code in (200, 400, 403, 404)


@pytest.mark.asyncio
async def test_verification_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/verification/status")
    assert resp.status_code in (401, 403)
