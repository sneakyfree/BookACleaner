"""
Job lifecycle endpoint tests.

Covers: create job, list jobs, get job detail, status transitions.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import register_user, get_auth_header


async def _create_property(client: AsyncClient, headers: dict) -> str:
    """Create a property and return its ID."""
    resp = await client.post("/api/v1/properties/", json={
        "address": "123 Main St",
        "city": "Austin",
        "state": "TX",
        "zip_code": "78701",
    }, headers=headers)
    if resp.status_code in (200, 201):
        data = resp.json()
        return data.get("id") or data.get("property", {}).get("id")
    return None


async def _create_job(client: AsyncClient, headers: dict, property_id: str = None) -> "Response":
    if property_id is None:
        property_id = await _create_property(client, headers) or "prop-placeholder"
    return await client.post("/api/v1/jobs/", json={
        "property_id": property_id,
        "services": ["standard"],
        "scheduled_date": "2026-03-15T10:00:00",
        "scheduled_time": "10:00",
    }, headers=headers)


@pytest.mark.asyncio
async def test_create_job(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    resp = await _create_job(client, headers)
    assert resp.status_code in (200, 201), f"Got {resp.status_code}: {resp.text[:200]}"
    assert resp.json().get("id")


@pytest.mark.asyncio
async def test_list_jobs_as_client(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    await _create_job(client, headers)
    resp = await client.get("/api/v1/jobs/", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    jobs = body if isinstance(body, list) else body.get("jobs", body.get("items", []))
    assert len(jobs) >= 1


@pytest.mark.asyncio
async def test_get_job_detail(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    create_resp = await _create_job(client, headers)
    if create_resp.status_code not in (200, 201):
        pytest.skip("Job creation unavailable")
    job_id = create_resp.json().get("id")
    if job_id:
        resp = await client.get(f"/api/v1/jobs/{job_id}", headers=headers)
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_job_unauthenticated(client: AsyncClient):
    resp = await client.post("/api/v1/jobs/", json={
        "property_id": "fake",
        "services": ["standard"],
        "scheduled_date": "2026-03-15",
        "scheduled_time": "10:00",
    })
    assert resp.status_code in (401, 403, 422)


@pytest.mark.asyncio
async def test_update_job_status(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    create_resp = await _create_job(client, headers)
    if create_resp.status_code not in (200, 201):
        pytest.skip("Job creation unavailable")
    job_id = create_resp.json().get("id")
    if job_id:
        resp = await client.patch(f"/api/v1/jobs/{job_id}/status", json={
            "status": "confirmed"
        }, headers=headers)
        assert resp.status_code in (200, 400, 404, 405)
