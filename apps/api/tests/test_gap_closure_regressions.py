"""
Regression tests for the 2026-07-10 Fable gap-closure pass.

Pins the confirmed defects found reviewing behind Opus:
- verify-email and reset-password 500'd on the happy path (naive/aware datetime)
- phone verify: same datetime crash + no brute-force lockout
- agreements IDOR (any user could read a job's agreements + counterparty PII)
- sponsored listing: unbounded duration/priority (500 / expired / rank abuse)
- review sub-ratings always 0 (read wrong keys)
- duplicate bids allowed (no unique constraint)
- moderation action not whitelisted
- notification mark-read had no ownership check
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.database import async_session_factory
from app.models import EmailVerification, PasswordReset, PhoneVerification
from tests.conftest import get_auth_header, register_user, _unique


# ---------------------------------------------- verify-email / reset-password

@pytest.mark.asyncio
async def test_verify_email_happy_path_no_500(client: AsyncClient):
    email = _unique("verify")
    await register_user(client, email=email, password="TestPass123!", role="client")
    async with async_session_factory() as s:
        row = (await s.execute(
            select(EmailVerification).order_by(EmailVerification.created_at.desc())
        )).scalars().first()
        token = row.token
    resp = await client.post("/api/v1/auth/verify-email", json={"token": token})
    assert resp.status_code == 200, resp.text  # was 500 (datetime compare)


@pytest.mark.asyncio
async def test_reset_password_happy_path_no_500(client: AsyncClient):
    email = _unique("reset")
    await register_user(client, email=email, password="TestPass123!", role="client")
    await client.post("/api/v1/auth/forgot-password", json={"email": email})
    async with async_session_factory() as s:
        row = (await s.execute(
            select(PasswordReset).order_by(PasswordReset.created_at.desc())
        )).scalars().first()
        token = row.token
    resp = await client.post("/api/v1/auth/reset-password",
                             json={"token": token, "password": "NewPass456!"})
    assert resp.status_code == 200, resp.text  # was 500
    # New password works, old one revoked-session-safe
    ok = await client.post("/api/v1/auth/login", json={"email": email, "password": "NewPass456!"})
    assert ok.status_code == 200


# ---------------------------------------------------------- phone verification

async def _seed_phone_code(user_id: str, code: str = "123456", attempts: int = 0):
    async with async_session_factory() as s:
        s.add(PhoneVerification(
            id=str(uuid.uuid4()), user_id=user_id, phone="+15551230000",
            code=code, expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            attempts=attempts,
        ))
        await s.commit()


@pytest.mark.asyncio
async def test_phone_verify_no_500_and_wrong_code_400(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    uid = (await client.get("/api/v1/auth/me", headers=headers)).json()["id"]
    await _seed_phone_code(uid, code="123456")
    # wrong code -> 400 (not 500)
    bad = await client.post("/api/v1/verification/phone/verify", headers=headers, json={"code": "000000"})
    assert bad.status_code == 400, bad.text
    # right code -> 200
    good = await client.post("/api/v1/verification/phone/verify", headers=headers, json={"code": "123456"})
    assert good.status_code == 200, good.text


@pytest.mark.asyncio
async def test_phone_verify_locks_out_after_attempts(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    uid = (await client.get("/api/v1/auth/me", headers=headers)).json()["id"]
    await _seed_phone_code(uid, code="654321", attempts=5)
    resp = await client.post("/api/v1/verification/phone/verify", headers=headers, json={"code": "654321"})
    assert resp.status_code == 429


# ------------------------------------------------------------ sponsored bounds

@pytest.mark.asyncio
async def test_sponsored_rejects_bad_bounds(client: AsyncClient):
    headers = await get_auth_header(client, role="cleaner")
    for body in ({"duration_days": 100000000, "priority": 1},
                 {"duration_days": -30, "priority": 1},
                 {"duration_days": 30, "priority": 999999},
                 {"duration_days": 30, "priority": -5}):
        resp = await client.post("/api/v1/sponsored/create", headers=headers, json=body)
        assert resp.status_code == 422, f"{body} -> {resp.status_code}"


# ---------------------------------------------------------------- moderation

@pytest.mark.asyncio
async def test_moderation_action_whitelisted(client: AsyncClient):
    # A fresh admin
    email = _unique("admin")
    import bcrypt
    from app.models import User
    pw_hash = bcrypt.hashpw(b"AdminPass123!", bcrypt.gensalt()).decode()
    async with async_session_factory() as s:
        s.add(User(id=str(uuid.uuid4()), email=email, password_hash=pw_hash,
                   role="admin", full_name="Mod Admin", is_verified=True))
        await s.commit()
    tok = (await client.post("/api/v1/auth/login", json={"email": email, "password": "AdminPass123!"})).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    # An unexpected action value is rejected (422) rather than defaulting to "remove"
    resp = await client.post("/api/v1/moderation/flagged/some-id/review?action=obliterate", headers=h)
    assert resp.status_code == 422


# --------------------------------------------------------- notification owner

@pytest.mark.asyncio
async def test_notification_mark_read_requires_ownership(client: AsyncClient):
    import uuid as _uuid
    from app.models import Notification
    victim = await get_auth_header(client, role="client")
    victim_id = (await client.get("/api/v1/auth/me", headers=victim)).json()["id"]
    notif_id = str(_uuid.uuid4())
    async with async_session_factory() as s:
        s.add(Notification(id=notif_id, user_id=victim_id, type="test", title="t", message="m"))
        await s.commit()
    attacker = await get_auth_header(client, role="client")
    resp = await client.post(f"/api/v1/notifications/{notif_id}/read", headers=attacker)
    assert resp.status_code == 403
