"""
Test configuration for BookACleaner API.

Uses PostgreSQL test database (bookacleaner_test) via docker-compose.
Falls back to SQLite in-memory if PostgreSQL is unavailable (CI without docker).
Run ``docker-compose up db`` before running tests.
Each test gets unique emails to avoid collisions.
"""
import uuid
import os
import pytest
import bcrypt
from httpx import AsyncClient, ASGITransport

from app.models import Base, User
from app.main import app
from app.database import db, engine, async_session_factory


_db_initialised = False


@pytest.fixture(autouse=True)
async def _ensure_db():
    """Ensure DB connected and cleaned once per session."""
    global _db_initialised
    if not _db_initialised:
        if not db.is_connected:
            await db.connect()
        # Wipe test data from previous run (one-time)
        async with engine.begin() as conn:
            for table in reversed(Base.metadata.sorted_tables):
                await conn.execute(table.delete())
        _db_initialised = True
    yield


@pytest.fixture
def client():
    """Async HTTPX test client."""
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


# ── helpers ──────────────────────────────────────────────────────────

def _unique(prefix: str = "u") -> str:
    """Return a unique @test.com email for every call."""
    return f"{prefix}-{uuid.uuid4().hex[:8]}@test.com"


async def register_user(
    client: AsyncClient,
    email: str | None = None,
    password: str = "TestPass123!",
    role: str = "client",
):
    if email is None:
        email = _unique()
    return await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "role": role,
    })


async def login_user(
    client: AsyncClient,
    email: str = "test@example.com",
    password: str = "TestPass123!",
):
    return await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
    })


async def get_auth_header(
    client: AsyncClient,
    email: str | None = None,
    password: str = "TestPass123!",
    role: str = "client",
) -> dict:
    """Register → ``{Authorization: Bearer …}``."""
    if email is None:
        email = _unique()
    resp = await register_user(client, email, password, role)
    data = resp.json()
    if "access_token" not in data:
        raise RuntimeError(f"Register failed ({resp.status_code}): {data}")
    return {"Authorization": f"Bearer {data['access_token']}"}


async def get_admin_auth_header(client: AsyncClient) -> dict:
    """Seed admin directly in DB (register rejects role=admin), then login."""
    email = _unique("admin")
    pw = "AdminPass123!"
    pw_hash = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

    async with async_session_factory() as session:
        session.add(User(
            id=str(uuid.uuid4()),
            email=email,
            password_hash=pw_hash,
            role="admin",
            full_name="Test Admin",
            is_verified=True,
        ))
        await session.commit()

    resp = await login_user(client, email, pw)
    data = resp.json()
    if "access_token" not in data:
        raise RuntimeError(f"Admin login failed ({resp.status_code}): {data}")
    return {"Authorization": f"Bearer {data['access_token']}"}
