"""
Tests for the owner-console backend: billing/payments admin, support help-desk,
and traffic/geographic analytics.
"""
import uuid
import pytest
import bcrypt
from httpx import AsyncClient

from app.database import async_session_factory
from app.models import User
from tests.conftest import get_auth_header, login_user


async def _admin(client: AsyncClient):
    email = f"admin-{uuid.uuid4().hex[:8]}@test.com"
    pw = "AdminPass123!"
    pw_hash = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
    async with async_session_factory() as s:
        s.add(User(id=str(uuid.uuid4()), email=email, password_hash=pw_hash,
                   role="admin", full_name="Ops Admin", is_verified=True))
        await s.commit()
    tok = (await login_user(client, email, pw)).json()["access_token"]
    return {"Authorization": f"Bearer {tok}"}


# ------------------------------------------------------------------- billing

@pytest.mark.asyncio
async def test_billing_overview_shape(client: AsyncClient):
    h = await _admin(client)
    r = await client.get("/api/v1/admin/billing/overview", headers=h)
    assert r.status_code == 200
    b = r.json()
    for k in ("gross_revenue", "platform_fee", "net_to_cleaners", "refunded_amount",
              "outstanding_payouts", "jobs_by_payment_status", "subscriptions_by_plan"):
        assert k in b


@pytest.mark.asyncio
async def test_billing_transactions_and_subscriptions(client: AsyncClient):
    h = await _admin(client)
    t = await client.get("/api/v1/admin/billing/transactions", headers=h)
    assert t.status_code == 200 and "transactions" in t.json()
    s = await client.get("/api/v1/admin/billing/subscriptions", headers=h)
    assert s.status_code == 200 and "subscriptions" in s.json()


@pytest.mark.asyncio
async def test_billing_requires_admin(client: AsyncClient):
    user_h = await get_auth_header(client, role="client")
    r = await client.get("/api/v1/admin/billing/overview", headers=user_h)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_billing_refund_nonexistent_job(client: AsyncClient):
    h = await _admin(client)
    r = await client.post("/api/v1/admin/billing/refund/nope", headers=h)
    assert r.status_code == 404


# ------------------------------------------------------------------- support

@pytest.mark.asyncio
async def test_support_ticket_lifecycle(client: AsyncClient):
    user_h = await get_auth_header(client, role="client")
    # user opens a ticket
    create = await client.post("/api/v1/support/tickets", headers=user_h,
                               json={"subject": "Double charged", "message": "I was billed twice",
                                     "category": "billing"})
    assert create.status_code == 200, create.text
    tid = create.json()["ticket"]["id"]

    # it shows in the user's list and in the admin queue
    mine = await client.get("/api/v1/support/tickets", headers=user_h)
    assert any(t["id"] == tid for t in mine.json()["tickets"])

    admin_h = await _admin(client)
    queue = await client.get("/api/v1/admin/support/tickets?status=open", headers=admin_h)
    assert queue.status_code == 200
    assert any(t["id"] == tid for t in queue.json()["tickets"])
    assert queue.json()["open_count"] >= 1

    # admin replies -> ticket goes pending
    reply = await client.post(f"/api/v1/admin/support/tickets/{tid}/reply", headers=admin_h,
                              json={"body": "Looking into it now."})
    assert reply.status_code == 200
    detail = await client.get(f"/api/v1/admin/support/tickets/{tid}", headers=admin_h)
    assert detail.json()["ticket"]["status"] == "pending"
    assert len(detail.json()["messages"]) == 2

    # admin resolves it
    upd = await client.patch(f"/api/v1/admin/support/tickets/{tid}", headers=admin_h,
                             json={"status": "resolved"})
    assert upd.status_code == 200 and upd.json()["ticket"]["status"] == "resolved"


@pytest.mark.asyncio
async def test_support_ticket_privacy(client: AsyncClient):
    owner_h = await get_auth_header(client, role="client")
    tid = (await client.post("/api/v1/support/tickets", headers=owner_h,
                             json={"subject": "Private issue", "message": "secret"})).json()["ticket"]["id"]
    stranger_h = await get_auth_header(client, role="client")
    r = await client.get(f"/api/v1/support/tickets/{tid}", headers=stranger_h)
    assert r.status_code == 403


# ------------------------------------------------------------------- traffic

@pytest.mark.asyncio
async def test_pageview_track_is_public_and_analytics_admin_only(client: AsyncClient):
    # public track (no auth), several views
    for path in ("/", "/cleaners", "/cleaners", "/pricing"):
        r = await client.post("/api/v1/analytics/track", json={"path": path, "referrer": "https://google.com/x"})
        assert r.status_code == 202

    admin_h = await _admin(client)
    traffic = await client.get("/api/v1/admin/analytics/traffic?range=7d", headers=admin_h)
    assert traffic.status_code == 200
    body = traffic.json()
    assert body["total_views"] >= 4
    assert len(body["series"]) == 7
    assert any(p["key"] == "/cleaners" for p in body["top_paths"])

    # analytics is admin-only
    user_h = await get_auth_header(client, role="client")
    assert (await client.get("/api/v1/admin/analytics/traffic", headers=user_h)).status_code == 403


@pytest.mark.asyncio
async def test_geography_endpoint(client: AsyncClient):
    admin_h = await _admin(client)
    r = await client.get("/api/v1/admin/analytics/geography?range=90d", headers=admin_h)
    assert r.status_code == 200 and "by_state" in r.json()
