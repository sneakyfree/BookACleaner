"""
Availability endpoint tests.
Covers: get schedule, update schedule, available slots.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import get_auth_header, _unique


@pytest.mark.asyncio
async def test_get_cleaner_availability(client: AsyncClient):
    """Get availability schedule for a cleaner."""
    headers = await get_auth_header(client, _unique("avail-cleaner"), role="cleaner")

    # First get profile to find cleaner_id
    resp = await client.get("/api/v1/cleaners/me", headers=headers)
    assert resp.status_code == 200
    cleaner_id = resp.json()["id"]

    # Get availability
    resp = await client.get(f"/api/v1/cleaners/{cleaner_id}/availability", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "schedule" in body
    assert len(body["schedule"]) == 7  # All 7 days


@pytest.mark.asyncio
async def test_update_my_availability(client: AsyncClient):
    """Cleaner can update their availability schedule."""
    headers = await get_auth_header(client, _unique("avail-update"), role="cleaner")

    # Auto-create cleaner profile
    await client.get("/api/v1/cleaners/me", headers=headers)

    resp = await client.put("/api/v1/cleaners/me/availability", json={
        "schedule": [
            {"day_of_week": 0, "start_time": "09:00", "end_time": "18:00", "is_available": True},
            {"day_of_week": 6, "start_time": "10:00", "end_time": "14:00", "is_available": False},
        ],
    }, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["message"] == "Availability updated"


@pytest.mark.asyncio
async def test_get_available_slots(client: AsyncClient):
    """Available slots endpoint should return time slots."""
    headers = await get_auth_header(client, _unique("slots-cleaner"), role="cleaner")
    resp = await client.get("/api/v1/cleaners/me", headers=headers)
    cleaner_id = resp.json()["id"]

    resp = await client.get(
        f"/api/v1/cleaners/{cleaner_id}/available-slots",
        params={"date": "2026-03-15"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "slots" in body
    assert "date" in body


@pytest.mark.asyncio
async def test_available_slots_invalid_date(client: AsyncClient):
    """Invalid date format should return 400."""
    headers = await get_auth_header(client, _unique("slots-bad"), role="cleaner")
    resp = await client.get("/api/v1/cleaners/me", headers=headers)
    cleaner_id = resp.json()["id"]

    resp = await client.get(
        f"/api/v1/cleaners/{cleaner_id}/available-slots",
        params={"date": "not-a-date"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_portfolio_crud(client: AsyncClient):
    """Portfolio photo CRUD lifecycle."""
    headers = await get_auth_header(client, _unique("portfolio"), role="cleaner")

    # Auto-create cleaner profile
    await client.get("/api/v1/cleaners/me", headers=headers)

    # GET empty portfolio
    resp = await client.get("/api/v1/cleaners/me/portfolio", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["photos"] == []

    # POST add photo
    resp = await client.post(
        "/api/v1/cleaners/me/portfolio",
        params={"url": "https://example.com/photo.jpg", "caption": "My best work"},
        headers=headers,
    )
    assert resp.status_code == 200
    photo_id = resp.json()["id"]
    assert photo_id

    # GET shows one photo
    resp = await client.get("/api/v1/cleaners/me/portfolio", headers=headers)
    assert len(resp.json()["photos"]) == 1

    # DELETE photo
    resp = await client.delete(f"/api/v1/cleaners/me/portfolio/{photo_id}", headers=headers)
    assert resp.status_code == 200

    # GET shows empty again
    resp = await client.get("/api/v1/cleaners/me/portfolio", headers=headers)
    assert len(resp.json()["photos"]) == 0
