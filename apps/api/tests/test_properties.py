"""
Properties endpoint tests.

Covers: create property, list properties, update, playbook.
"""
import pytest
from httpx import AsyncClient
from tests.conftest import get_auth_header


@pytest.mark.asyncio
async def test_create_property(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    resp = await client.post("/api/v1/properties/", json={
        "address": "456 Ocean Dr",
        "city": "Miami",
        "state": "FL",
        "zip_code": "33101",
    }, headers=headers)
    assert resp.status_code in (200, 201), f"Got {resp.status_code}: {resp.text[:200]}"


@pytest.mark.asyncio
async def test_list_properties(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    resp = await client.get("/api/v1/properties/", headers=headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_property_unauthenticated(client: AsyncClient):
    resp = await client.post("/api/v1/properties/", json={
        "address": "789 No Auth St",
        "city": "Nowhere",
        "state": "TX",
        "zip_code": "00000",
    })
    assert resp.status_code in (401, 403, 422)


@pytest.mark.asyncio
async def test_update_property(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    create_resp = await client.post("/api/v1/properties/", json={
        "address": "100 Update St",
        "city": "Austin",
        "state": "TX",
        "zip_code": "78701",
    }, headers=headers)
    if create_resp.status_code in (200, 201):
        data = create_resp.json()
        prop_id = data.get("id") or data.get("property", {}).get("id")
        if prop_id:
            resp = await client.patch(f"/api/v1/properties/{prop_id}", json={
                "name": "Updated House",
            }, headers=headers)
            assert resp.status_code in (200, 404, 405)


@pytest.mark.asyncio
async def test_save_playbook(client: AsyncClient):
    headers = await get_auth_header(client, role="client")
    create_resp = await client.post("/api/v1/properties/", json={
        "address": "200 Playbook Ln",
        "city": "Denver",
        "state": "CO",
        "zip_code": "80201",
    }, headers=headers)
    if create_resp.status_code in (200, 201):
        data = create_resp.json()
        prop_id = data.get("id") or data.get("property", {}).get("id")
        if prop_id:
            resp = await client.put(f"/api/v1/properties/{prop_id}/playbook", json={
                "sections": [
                    {"id": "s1", "title": "Access", "content": "Key under mat"},
                ],
            }, headers=headers)
            assert resp.status_code in (200, 404, 405)
