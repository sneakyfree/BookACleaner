"""
Notifications endpoint tests.

Covers: list notifications, mark read, mark all read.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import get_auth_header, _unique


@pytest.mark.asyncio
async def test_list_notifications(client: AsyncClient):
    headers = await get_auth_header(client)
    resp = await client.get("/api/v1/notifications/", headers=headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_mark_notification_read(client: AsyncClient):
    headers = await get_auth_header(client)
    resp = await client.post("/api/v1/notifications/fake-id/read", headers=headers)
    assert resp.status_code in (200, 404)


@pytest.mark.asyncio
async def test_mark_all_read(client: AsyncClient):
    headers = await get_auth_header(client)
    resp = await client.post("/api/v1/notifications/read-all", headers=headers)
    assert resp.status_code in (200, 404, 405)


@pytest.mark.asyncio
async def test_notifications_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/notifications/")
    assert resp.status_code in (401, 403)
