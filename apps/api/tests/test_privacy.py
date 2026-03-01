"""
Privacy (GDPR) endpoint tests.
Covers: data export, account deletion.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import get_auth_header, _unique


@pytest.mark.asyncio
async def test_export_user_data(client: AsyncClient):
    """GDPR export should return user's data as JSON."""
    headers = await get_auth_header(client, _unique("export"))
    resp = await client.get("/api/v1/privacy/export", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "user" in body
    assert "exported_at" in body
    # Should not contain password hash
    assert "password_hash" not in body.get("user", {})


@pytest.mark.asyncio
async def test_export_requires_auth(client: AsyncClient):
    """Export without auth should return 401."""
    resp = await client.get("/api/v1/privacy/export")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_requires_confirmation(client: AsyncClient):
    """Delete without confirm=true should fail."""
    headers = await get_auth_header(client, _unique("noconfirm"))
    resp = await client.post("/api/v1/privacy/delete", json={"confirm": False}, headers=headers)
    assert resp.status_code == 400
    assert "confirm" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_delete_user_data(client: AsyncClient):
    """GDPR delete should permanently remove user and return confirmation."""
    email = _unique("deleteme")
    headers = await get_auth_header(client, email)

    # Confirm the user exists first
    resp = await client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200

    # Delete the account
    resp = await client.post(
        "/api/v1/privacy/delete",
        json={"confirm": True, "reason": "Test deletion"},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "permanently deleted" in body["message"].lower()
    assert "user_account" in body["details"]["entities_deleted"]
