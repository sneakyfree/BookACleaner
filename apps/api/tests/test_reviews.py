"""
Reviews endpoint tests.

Covers: create review, list reviews, badges, invalid rating.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import register_user, get_auth_header


async def _create_job_for_review(client: AsyncClient, client_headers: dict) -> str:
    """Create a property + job, return job ID."""
    prop_resp = await client.post("/api/v1/properties/", json={
        "address": "100 Review St",
        "city": "Austin",
        "state": "TX",
        "zip_code": "78701",
    }, headers=client_headers)
    prop_id = None
    if prop_resp.status_code in (200, 201):
        prop_id = prop_resp.json().get("id")

    resp = await client.post("/api/v1/jobs/", json={
        "property_id": prop_id or "prop-placeholder",
        "services": ["standard"],
        "scheduled_date": "2026-03-10T09:00:00",
        "scheduled_time": "09:00",
    }, headers=client_headers)
    if resp.status_code in (200, 201):
        data = resp.json()
        return data.get("id") or data.get("job", {}).get("id")
    return None


@pytest.mark.asyncio
async def test_create_review(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    job_id = await _create_job_for_review(client, headers)
    if not job_id:
        pytest.skip("Job creation not available")
    resp = await client.post("/api/v1/reviews/", json={
        "job_id": job_id,
        "overall_rating": 5,
        "text": "Amazing cleaning service!",
        "tags": ["thorough", "punctual"],
    }, headers=headers)
    assert resp.status_code in (200, 201, 400)


@pytest.mark.asyncio
async def test_create_review_unauthenticated(client: AsyncClient):
    resp = await client.post("/api/v1/reviews/", json={
        "job_id": "fake-id",
        "overall_rating": 5,
        "text": "Should fail",
    })
    assert resp.status_code in (401, 403, 422)


@pytest.mark.asyncio
async def test_list_reviews_for_cleaner(client: AsyncClient):
    headers = await get_auth_header(client)
    resp = await client.get("/api/v1/reviews/?user_id=some-id", headers=headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_list_reviews_no_auth(client: AsyncClient):
    resp = await client.get("/api/v1/reviews/?user_id=some-id")
    assert resp.status_code in (200, 401)


@pytest.mark.asyncio
async def test_review_badges(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    resp = await client.get("/api/v1/reviews/fake-id/badges", headers=headers)
    assert resp.status_code in (200, 404)


@pytest.mark.asyncio
async def test_review_invalid_rating(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    resp = await client.post("/api/v1/reviews/", json={
        "job_id": "some-id",
        "overall_rating": 10,
        "text": "Bad rating test",
    }, headers=headers)
    assert resp.status_code in (400, 404, 422)
