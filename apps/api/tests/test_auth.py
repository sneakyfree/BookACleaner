"""
Authentication endpoint tests.

Covers: register, login, verify-email, forgot-password, reset-password, /me.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import register_user, login_user, get_auth_header, _unique


# ─── Registration ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_client(client: AsyncClient):
    email = _unique("regclient")
    resp = await register_user(client, email, "Pass123!", "client")
    assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text[:200]}"
    body = resp.json()
    assert body["access_token"]
    assert body["user"]["email"] == email
    assert body["user"]["role"] == "client"


@pytest.mark.asyncio
async def test_register_cleaner(client: AsyncClient):
    email = _unique("regcleaner")
    resp = await register_user(client, email, "Pass123!", "cleaner")
    assert resp.status_code == 200
    assert resp.json()["user"]["role"] == "cleaner"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    email = _unique("dup")
    await register_user(client, email)
    resp = await register_user(client, email)
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_invalid_role(client: AsyncClient):
    resp = await register_user(client, _unique("badrole"), role="hacker")
    assert resp.status_code == 400


# ─── Login ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    email = _unique("login")
    await register_user(client, email, "Pass123!")
    resp = await login_user(client, email, "Pass123!")
    assert resp.status_code == 200
    assert resp.json()["access_token"]


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    email = _unique("wrongpw")
    await register_user(client, email, "Pass123!")
    resp = await login_user(client, email, "BadPass!")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_email(client: AsyncClient):
    resp = await login_user(client, _unique("ghost"), "Pass123!")
    assert resp.status_code == 401


# ─── Get Current User (/me) ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient):
    email = _unique("me")
    headers = await get_auth_header(client, email)
    resp = await client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == email


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_bad_token(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer bad-token"})
    assert resp.status_code == 401


# ─── Forgot / Reset Password ────────────────────────────────────────

@pytest.mark.asyncio
async def test_forgot_password_always_200(client: AsyncClient):
    """Forgot-password should always return 200 to prevent email enumeration."""
    resp = await client.post("/api/v1/auth/forgot-password", json={"email": "nobody@test.com"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_reset_password_bad_token(client: AsyncClient):
    resp = await client.post("/api/v1/auth/reset-password", json={
        "token": "nonexistent-token",
        "password": "NewPass456!",
    })
    assert resp.status_code == 400
