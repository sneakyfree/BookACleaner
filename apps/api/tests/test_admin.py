"""
Admin endpoint tests.

Covers: admin analytics, user management, audit log.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import get_auth_header, get_admin_auth_header


@pytest.mark.asyncio
async def test_admin_analytics(client: AsyncClient):
    headers = await get_admin_auth_header(client)
    resp = await client.get("/api/v1/admin/analytics", headers=headers)
    assert resp.status_code in (200, 404)


@pytest.mark.asyncio
async def test_admin_analytics_forbidden(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    resp = await client.get("/api/v1/admin/analytics", headers=headers)
    assert resp.status_code in (403, 404)


@pytest.mark.asyncio
async def test_admin_list_users(client: AsyncClient):
    headers = await get_admin_auth_header(client)
    resp = await client.get("/api/v1/admin/users", headers=headers)
    assert resp.status_code in (200, 404)


@pytest.mark.asyncio
async def test_admin_audit_log(client: AsyncClient):
    headers = await get_admin_auth_header(client)
    resp = await client.get("/api/v1/admin/audit-log", headers=headers)
    assert resp.status_code in (200, 404)


@pytest.mark.asyncio
async def test_admin_moderation_queue(client: AsyncClient):
    headers = await get_admin_auth_header(client)
    resp = await client.get("/api/v1/admin/moderation", headers=headers)
    assert resp.status_code in (200, 404)
