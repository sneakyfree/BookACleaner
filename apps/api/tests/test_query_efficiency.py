"""Query-count regressions for list endpoints.

An N+1 never fails a functional test — the endpoint returns correct data, just
with one query per row. It only shows up as latency once the table is large,
which is exactly when it is most expensive to discover.

These tests count the SQL actually issued and assert it does not grow with the
number of rows, so a reintroduced per-row lookup fails CI instead of quietly
degrading the marketplace.
"""
import uuid
from contextlib import contextmanager

import pytest
from sqlalchemy import event

from app.database import db, engine


@contextmanager
def count_queries():
    """Count SQL statements issued inside the block."""
    seen = []
    sync_engine = engine.sync_engine

    def _on_execute(conn, cursor, statement, parameters, context, executemany):
        seen.append(statement)

    event.listen(sync_engine, "before_cursor_execute", _on_execute)
    try:
        yield seen
    finally:
        event.remove(sync_engine, "before_cursor_execute", _on_execute)


async def make_cleaners(n: int):
    """n cleaner profiles, each owned by its own user."""
    for i in range(n):
        u = await db.user.create(
            data={
                "email": f"qe-{i}-{uuid.uuid4().hex[:8]}@test.com",
                "password_hash": "x",
                "role": "cleaner",
                "full_name": f"QE Cleaner {i}",
            }
        )
        await db.cleaner.create(
            data={
                "user_id": u["id"],
                "business_name": f"QE Biz {i}",
                "hourly_rate": 40.0 + i,
                "verification_tier": 3,
                "rating": 4.0,
            }
        )


@pytest.mark.asyncio
async def test_marketplace_listing_does_not_scale_queries_with_rows(client):
    """The cleaner listing must issue a constant number of queries.

    It used to run `SELECT * FROM cleaner_profiles` with no bound and then one
    user lookup per row, before pagination — so the cost tracked the size of
    the whole table, not the size of the page. Measured 15 queries for 12
    cleaners, and the same 15 with limit=5.
    """
    await make_cleaners(6)
    with count_queries() as small:
        r1 = await client.get("/api/v1/cleaners/", params={"limit": 5})
    assert r1.status_code == 200, r1.text
    small_count = len(small)

    # Quadruple the table.
    await make_cleaners(18)
    with count_queries() as large:
        r2 = await client.get("/api/v1/cleaners/", params={"limit": 5})
    assert r2.status_code == 200, r2.text
    large_count = len(large)

    assert large_count == small_count, (
        f"query count grew with table size ({small_count} -> {large_count}): "
        "a per-row lookup has been reintroduced"
    )
    assert small_count <= 4, (
        f"listing issues {small_count} queries; expected a small constant "
        "(one for cleaners, one batched lookup for the page's users)"
    )


@pytest.mark.asyncio
async def test_listing_respects_limit(client):
    """Pagination must bound the response, not just the tail of the work."""
    await make_cleaners(9)
    resp = await client.get("/api/v1/cleaners/", params={"limit": 3})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body["cleaners"]) <= 3
    assert body["limit"] == 3
    assert body["total"] >= 9


@pytest.mark.asyncio
async def test_listing_still_resolves_owner_names(client):
    """Batching the user lookup must not drop the joined fields."""
    await make_cleaners(3)
    resp = await client.get("/api/v1/cleaners/", params={"limit": 50})
    assert resp.status_code == 200, resp.text
    cleaners = resp.json()["cleaners"]
    named = [c for c in cleaners if c.get("name")]
    assert named, "no cleaner resolved a name — the batched user lookup is broken"
    assert all("QE Cleaner" in c["name"] for c in named if "QE Biz" in (c.get("businessName") or ""))


@pytest.mark.asyncio
async def test_pagination_pages_do_not_overlap(client):
    """Page 2 must continue where page 1 stopped."""
    await make_cleaners(8)
    p1 = await client.get("/api/v1/cleaners/", params={"limit": 4, "page": 1})
    p2 = await client.get("/api/v1/cleaners/", params={"limit": 4, "page": 2})
    assert p1.status_code == 200 and p2.status_code == 200

    ids1 = {c["id"] for c in p1.json()["cleaners"]}
    ids2 = {c["id"] for c in p2.json()["cleaners"]}
    assert ids1 and ids2
    assert not (ids1 & ids2), "pages returned overlapping cleaners"


# ── the documented search path ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_documented_search_endpoint_exists(client):
    """`/cleaners/search` is in the README and the public API docs.

    It was never implemented, so the request fell through to /{cleaner_id} and
    returned 404 "Cleaner not found" — the headline Smart Search feature
    answering as if it were a missing profile.
    """
    await make_cleaners(2)
    resp = await client.get("/api/v1/cleaners/search")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "cleaners" in body and isinstance(body["cleaners"], list)


@pytest.mark.asyncio
async def test_search_alias_matches_root_listing(client):
    """The alias must be the same endpoint, not a divergent second one."""
    await make_cleaners(4)
    root = await client.get("/api/v1/cleaners/", params={"limit": 3})
    alias = await client.get("/api/v1/cleaners/search", params={"limit": 3})
    assert root.status_code == alias.status_code == 200
    assert root.json()["total"] == alias.json()["total"]
    assert [c["id"] for c in root.json()["cleaners"]] == [
        c["id"] for c in alias.json()["cleaners"]
    ]


@pytest.mark.asyncio
async def test_search_supports_filters(client):
    """Filters apply on the documented path too."""
    await make_cleaners(5)
    resp = await client.get(
        "/api/v1/cleaners/search", params={"minTier": 3, "limit": 10}
    )
    assert resp.status_code == 200, resp.text
    for c in resp.json()["cleaners"]:
        assert c["verificationTier"] >= 3


@pytest.mark.asyncio
async def test_search_is_not_shadowed_by_id_route(client):
    """A real cleaner id must still resolve — the alias must not swallow it."""
    await make_cleaners(1)
    listing = await client.get("/api/v1/cleaners/", params={"limit": 1})
    cleaner_id = listing.json()["cleaners"][0]["id"]

    resp = await client.get(f"/api/v1/cleaners/{cleaner_id}")
    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == cleaner_id


# ── conversations listing ─────────────────────────────────────────────────


async def _make_conversation(client, sender_headers, recipient_id, body="hi"):
    resp = await client.post(
        "/api/v1/messages/send",
        json={"recipient_id": recipient_id, "content": body},
        headers=sender_headers,
    )
    assert resp.status_code in (200, 201), resp.text
    return resp


@pytest.mark.asyncio
async def test_conversation_list_queries_do_not_scale_with_other_users_threads(client):
    """My inbox must not pay for other people's conversations.

    The endpoint used to load every conversation on the platform and run a
    participant check, a message fetch and a user lookup against each one
    before discarding the ones I'm not in.
    """
    from tests.money_helpers import make_user

    mine_h, mine_id, _ = await make_user(client, "client")
    peer_h, peer_id, _ = await make_user(client, "cleaner")
    await _make_conversation(client, mine_h, peer_id)

    with count_queries() as before:
        r1 = await client.get("/api/v1/messages/conversations", headers=mine_h)
    assert r1.status_code == 200, r1.text
    baseline = len(before)

    # Unrelated third parties chat amongst themselves.
    for _ in range(6):
        a_h, a_id, _ = await make_user(client, "client")
        b_h, b_id, _ = await make_user(client, "cleaner")
        await _make_conversation(client, a_h, b_id, body="not yours")

    with count_queries() as after:
        r2 = await client.get("/api/v1/messages/conversations", headers=mine_h)
    assert r2.status_code == 200, r2.text

    assert len(after) == baseline, (
        f"query count grew from {baseline} to {len(after)} because OTHER users "
        "created conversations"
    )


@pytest.mark.asyncio
async def test_conversation_list_only_returns_my_threads(client):
    """Scoping by participation must not leak anyone else's thread."""
    from tests.money_helpers import make_user

    mine_h, _, _ = await make_user(client, "client")
    peer_h, peer_id, _ = await make_user(client, "cleaner")
    await _make_conversation(client, mine_h, peer_id, body="mine")

    out_h, _, _ = await make_user(client, "client")
    other_h, other_id, _ = await make_user(client, "cleaner")
    await _make_conversation(client, out_h, other_id, body="secret")

    resp = await client.get("/api/v1/messages/conversations", headers=mine_h)
    assert resp.status_code == 200, resp.text
    contents = [
        (c.get("last_message") or {}).get("content") for c in resp.json()
    ]
    assert "mine" in contents
    assert "secret" not in contents, "another user's message leaked into my inbox"


@pytest.mark.asyncio
async def test_conversation_list_resolves_the_other_participant(client):
    """Batching must still name the person on the other end."""
    from tests.money_helpers import make_user

    mine_h, _, _ = await make_user(client, "client")
    peer_h, peer_id, _ = await make_user(client, "cleaner")
    await _make_conversation(client, mine_h, peer_id)

    resp = await client.get("/api/v1/messages/conversations", headers=mine_h)
    assert resp.status_code == 200, resp.text
    convos = resp.json()
    assert convos, "conversation missing from my list"
    other = convos[0].get("other_participant")
    assert other and other.get("id") == peer_id


@pytest.mark.asyncio
async def test_conversation_list_empty_for_new_user(client):
    """No threads means an empty list and no wasted work."""
    from tests.money_helpers import make_user

    headers, _, _ = await make_user(client, "client")
    with count_queries() as seen:
        resp = await client.get("/api/v1/messages/conversations", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []
    assert len(seen) <= 3, f"empty inbox issued {len(seen)} queries"


# ── batched IN support in the db wrapper ──────────────────────────────────


@pytest.mark.asyncio
async def test_find_many_supports_in_clause(client):
    """A list value must become one IN query, not silently match nothing."""
    await make_cleaners(3)
    cleaners = await db.cleaner.find_many()
    ids = [c["user_id"] for c in cleaners[:3] if c.get("user_id")]
    assert len(ids) == 3

    with count_queries() as seen:
        users = await db.user.find_many(where={"id": ids})

    assert len(seen) == 1, f"expected a single batched query, got {len(seen)}"
    assert {u["id"] for u in users} == set(ids)


@pytest.mark.asyncio
async def test_find_many_empty_in_returns_nothing(client):
    """An empty list must match nothing — never everything."""
    await make_cleaners(2)
    with count_queries() as seen:
        users = await db.user.find_many(where={"id": []})
    assert users == []
    assert len(seen) == 0, "empty IN should short-circuit without querying"
