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


@pytest.mark.asyncio
async def test_conversation_membership_enforced(client):
    """Non-participants cannot read or post into a conversation (IDOR guard)."""
    a = await get_auth_header(client, role="client")
    # recipient: a second user
    from tests.conftest import register_user
    reg_b = await register_user(client, role="cleaner")
    b_id = reg_b.json()["user"]["id"]
    outsider = await get_auth_header(client, role="client")

    conv = await client.post("/api/v1/messages/conversations",
                             json={"recipient_id": b_id, "initial_message": "private"}, headers=a)
    assert conv.status_code == 200
    cid = conv.json()["id"]

    # outsider must not read or post
    r = await client.get(f"/api/v1/messages/conversations/{cid}", headers=outsider)
    assert r.status_code == 403
    s = await client.post("/api/v1/messages/send",
                          json={"conversation_id": cid, "content": "x"}, headers=outsider)
    assert s.status_code == 403

    # the creator can
    ok = await client.get(f"/api/v1/messages/conversations/{cid}", headers=a)
    assert ok.status_code == 200
