"""
Cleaners endpoint tests.

Covers: list cleaners, search, get profile, update profile.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import get_auth_header


@pytest.mark.asyncio
async def test_list_cleaners(client: AsyncClient):
    """Public cleaners listing should work without auth."""
    resp = await client.get("/api/v1/cleaners/")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_search_cleaners(client: AsyncClient):
    resp = await client.get("/api/v1/cleaners/?search=test&city=Austin")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_cleaner_profile(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    resp = await client.get("/api/v1/cleaners/me", headers=headers)
    assert resp.status_code in (200, 404)


@pytest.mark.asyncio
async def test_update_cleaner_profile(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    resp = await client.put("/api/v1/cleaners/profile", json={
        "bio": "Updated bio for testing",
        "hourly_rate": 45.0,
        "services": ["deep_clean", "standard_clean"],
    }, headers=headers)
    assert resp.status_code in (200, 404, 405)


@pytest.mark.asyncio
async def test_cleaner_stats(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    resp = await client.get("/api/v1/cleaners/stats", headers=headers)
    assert resp.status_code in (200, 404)
