"""
Regression tests for the 2026-07-05 witch-hunt gap analysis.

These reproduce live-verified bugs that the existing suite missed because it
asserted lax `status in (200, 404)` and never exercised the failing paths.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import get_auth_header, get_admin_auth_header


@pytest.mark.asyncio
async def test_admin_stats_does_not_500_on_datetime(client: AsyncClient):
    """admin/stats compared a naive (SQLite) created_at against an aware
    datetime -> 'can't compare offset-naive and offset-aware datetimes' 500,
    which broke the entire admin dashboard. Must be 200 (never 500)."""
    # ensure at least one freshly-created user is in the 7-day window
    await get_auth_header(client, role="client")
    headers = await get_admin_auth_header(client)
    for path in ("/api/v1/admin/stats", "/api/v1/admin/stats?time_range=30d"):
        resp = await client.get(path, headers=headers)
        assert resp.status_code != 500, f"{path} 500'd: {resp.text[:200]}"
        assert resp.status_code == 200, f"{path} -> {resp.status_code}"


@pytest.mark.asyncio
async def test_patch_users_me_does_not_leak_secrets(client: AsyncClient):
    """PATCH /users/me returned the raw ORM row including the bcrypt
    password_hash and refresh_token. Response must be sanitized."""
    headers = await get_auth_header(client, role="client")
    resp = await client.patch("/api/v1/users/me", headers=headers, json={"phone": "555-0101"})
    assert resp.status_code == 200, resp.text
    user = resp.json().get("user", {})
    assert "password_hash" not in user, "password_hash leaked in PATCH /users/me"
    assert "refresh_token" not in user, "refresh_token leaked in PATCH /users/me"
    assert user.get("phone") == "555-0101"
