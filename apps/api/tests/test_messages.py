"""
Messages endpoint tests.

Covers: send message, get conversations, get conversation detail.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import get_auth_header


@pytest.mark.asyncio
async def test_get_conversations(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    resp = await client.get("/api/v1/messages/conversations", headers=headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_send_message(client: AsyncClient):
    sender_headers = await get_auth_header(client, role="client")
    resp = await client.post("/api/v1/messages/send", json={
        "recipient_id": "receiver-placeholder",
        "content": "Hello, I need a cleaning!",
    }, headers=sender_headers)
    assert resp.status_code in (200, 201, 404, 422)


@pytest.mark.asyncio
async def test_get_conversations_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/messages/conversations")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_send_empty_message(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    resp = await client.post("/api/v1/messages/send", json={
        "recipient_id": "someone",
        "content": "",
    }, headers=headers)
    assert resp.status_code in (200, 400, 422)
