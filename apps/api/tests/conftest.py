"""
Test configuration for BookACleaner API.

Uses the real FastAPI TestClient against an in-memory SQLite database
so tests are fast and isolated while exercising the full route stack.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import db


@pytest.fixture(autouse=True)
async def setup_db():
    """Connect (creates tables) before each test, disconnect after."""
    await db.connect()
    yield
    await db.disconnect()


@pytest.fixture
def client():
    """Provide an async HTTPX test client bound to the FastAPI app."""
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


# ── helpers ──────────────────────────────────────────────────────────

async def register_user(client: AsyncClient, email: str = "test@example.com",
                        password: str = "TestPass123!", role: str = "client") -> dict:
    """Register a user and return the full response JSON."""
    resp = await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "role": role,
    })
    return resp


async def login_user(client: AsyncClient, email: str = "test@example.com",
                     password: str = "TestPass123!") -> dict:
    """Login and return the response."""
    resp = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
    })
    return resp


async def get_auth_header(client: AsyncClient, email: str = "test@example.com",
                          password: str = "TestPass123!", role: str = "client") -> dict:
    """Register → return Authorization header dict."""
    resp = await register_user(client, email, password, role)
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
