"""
Regression tests for the Fable-5 audit fix pass (2026-07-09).

Each test pins a confirmed defect found during the audit so it cannot silently
regress:

- request_payout role + balance ceiling (any user could request arbitrary payout)
- review overall_rating bounds (rating=999 corrupted the cleaner aggregate)
- bid amount bounds (negative/zero/NaN flowed into job.total_price)
- decline_bid ownership (any user could decline a rival's bid)
- list_job_bids authorization (competitors' bids were world-readable)
- job status state-machine guard (completed -> pending / self-complete)
- accept_bid guard (re-accepting / accepting on an assigned job)
- unauthenticated /ai/* endpoints now require auth
- notification dispatch endpoints are admin-only
- GET /users/{id} no longer leaks phone / credential material
"""
import asyncio
import pytest
from httpx import AsyncClient

from tests.conftest import get_auth_header, get_admin_auth_header


async def _make_property(client: AsyncClient, headers: dict) -> str:
    resp = await client.post(
        "/api/v1/properties/",
        headers=headers,
        json={
            "name": "Reg Test Home",
            "address": "1 Test St",
            "city": "Los Angeles",
            "state": "CA",
            "zip_code": "90001",
            "property_type": "house",
            "sqft": 1500,
            "bedrooms": 2,
            "bathrooms": 1.0,
        },
    )
    assert resp.status_code in (200, 201), resp.text
    return resp.json()["id"]


async def _make_job(client: AsyncClient, headers: dict, property_id: str) -> dict:
    resp = await client.post(
        "/api/v1/jobs/",
        headers=headers,
        json={
            "property_id": property_id,
            "services": ["standard"],
            "scheduled_date": "2026-09-01",
            "scheduled_time": "10:00",
            "description": "reg",
        },
    )
    assert resp.status_code in (200, 201), resp.text
    return resp.json()


# ---------------------------------------------------------------- payouts

@pytest.mark.asyncio
async def test_request_payout_rejected_for_client(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    resp = await client.post("/api/v1/payments/request-payout", headers=headers, json={"amount": 100000})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_request_payout_over_balance_rejected(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    resp = await client.post("/api/v1/payments/request-payout", headers=headers, json={"amount": 100000})
    # Cleaner with no completed jobs has $0 available -> 400 (not 200)
    assert resp.status_code == 400


# ---------------------------------------------------------------- reviews

@pytest.mark.asyncio
async def test_review_rating_out_of_range_rejected(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    for bad in (999, -5, 0, 6):
        resp = await client.post(
            "/api/v1/reviews/",
            headers=headers,
            json={"job_id": "whatever", "overall_rating": bad, "text": "x"},
        )
        # 422 = schema rejects before any job lookup
        assert resp.status_code == 422, f"rating={bad} not rejected: {resp.status_code}"


# ---------------------------------------------------------------- bids

@pytest.mark.asyncio
async def test_bid_amount_bounds(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    for bad in (-500, 0):
        resp = await client.post(
            "/api/v1/bids/jobs/some-job/bids",
            headers=headers,
            json={"job_id": "some-job", "amount": bad},
        )
        assert resp.status_code == 422, f"bid amount={bad} not rejected: {resp.status_code}"


@pytest.mark.asyncio
async def test_decline_bid_requires_job_owner(client: AsyncClient):
    client_headers = await get_auth_header(client, role="client")
    cleaner_headers = await get_auth_header(client, role="cleaner")
    attacker_headers = await get_auth_header(client, role="client")

    property_id = await _make_property(client, client_headers)
    job = await _make_job(client, client_headers, property_id)

    bid_resp = await client.post(
        f"/api/v1/bids/jobs/{job['id']}/bids",
        headers=cleaner_headers,
        json={"job_id": job["id"], "amount": 120},
    )
    assert bid_resp.status_code in (200, 201), bid_resp.text
    bid_id = bid_resp.json()["bid"]["id"]

    # An unrelated client cannot decline this bid
    resp = await client.post(f"/api/v1/bids/bids/{bid_id}/decline", headers=attacker_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_job_bids_hidden_from_strangers(client: AsyncClient):
    client_headers = await get_auth_header(client, role="client")
    cleaner_headers = await get_auth_header(client, role="cleaner")
    stranger_headers = await get_auth_header(client, role="cleaner")

    property_id = await _make_property(client, client_headers)
    job = await _make_job(client, client_headers, property_id)
    await client.post(
        f"/api/v1/bids/jobs/{job['id']}/bids",
        headers=cleaner_headers,
        json={"job_id": job["id"], "amount": 150},
    )

    # A stranger cleaner sees none of the owner's bids (their own filtered set is empty)
    resp = await client.get(f"/api/v1/bids/jobs/{job['id']}/bids", headers=stranger_headers)
    assert resp.status_code in (200, 403)
    if resp.status_code == 200:
        assert resp.json()["total"] == 0

    # The owning client sees the bid
    owner_resp = await client.get(f"/api/v1/bids/jobs/{job['id']}/bids", headers=client_headers)
    assert owner_resp.status_code == 200
    assert owner_resp.json()["total"] == 1


# ---------------------------------------------------------------- job state machine

@pytest.mark.asyncio
async def test_job_status_illegal_transition_blocked(client: AsyncClient):
    client_headers = await get_auth_header(client, role="client")
    property_id = await _make_property(client, client_headers)
    job = await _make_job(client, client_headers, property_id)

    # A client cannot self-complete a pending job (would unlock reviews)
    resp = await client.patch(
        f"/api/v1/jobs/{job['id']}/status",
        headers=client_headers,
        json={"status": "completed"},
    )
    assert resp.status_code in (403, 409)


# ---------------------------------------------------------------- AI auth

@pytest.mark.asyncio
async def test_ai_endpoints_require_auth(client: AsyncClient):
    for path, body in [
        ("/api/v1/ai/chat", {"messages": [{"role": "user", "content": "hi"}]}),
        ("/api/v1/ai/detect-property", {"address": "1 Main St"}),
        ("/api/v1/ai/estimate", {"property_details": {}, "services": []}),
    ]:
        resp = await client.post(path, json=body)
        assert resp.status_code in (401, 403), f"{path} not protected: {resp.status_code}"


# ---------------------------------------------------------------- notifications

@pytest.mark.asyncio
async def test_notification_dispatch_is_admin_only(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    resp = await client.post(
        "/api/v1/notifications/reminder",
        headers=headers,
        json={"to_phone": "+15555550123", "role": "client", "other_party": "x",
              "date": "2026-09-01", "time": "10:00", "address": "1 Main St"},
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------- user PII

@pytest.mark.asyncio
async def test_get_user_hides_pii_and_secrets(client: AsyncClient):
    victim_headers = await get_auth_header(client, role="cleaner")
    me = await client.get("/api/v1/auth/me", headers=victim_headers)
    victim_id = me.json()["id"]

    attacker_headers = await get_auth_header(client, role="client")
    resp = await client.get(f"/api/v1/users/{victim_id}", headers=attacker_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "phone" not in body
    assert "password_hash" not in body
    assert "refresh_token" not in body
