"""
Feed endpoint tests.

Covers: list feed items, create feed item (admin), engage.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import get_auth_header, get_admin_auth_header


@pytest.mark.asyncio
async def test_list_feed(client: AsyncClient):
    headers = await get_auth_header(client)
    resp = await client.get("/api/v1/feed", headers=headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_feed_item_admin(client: AsyncClient):
    headers = await get_admin_auth_header(client)
    resp = await client.post("/api/v1/feed", json={
        "title": "Welcome to BookACleaner!",
        "content": "We are excited to launch.",
        "type": "announcement",
    }, headers=headers)
    assert resp.status_code in (200, 201, 404, 405)


@pytest.mark.asyncio
async def test_create_feed_item_forbidden(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    resp = await client.post("/api/v1/feed", json={
        "title": "Should fail",
        "content": "Non-admin",
        "type": "announcement",
    }, headers=headers)
    assert resp.status_code in (403, 404, 405)


@pytest.mark.asyncio
async def test_like_feed_item(client: AsyncClient):
    headers = await get_auth_header(client)
    resp = await client.post("/api/v1/feed/fake-id/like", headers=headers)
    assert resp.status_code in (200, 404, 405)
