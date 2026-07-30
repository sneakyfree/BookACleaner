"""Badges must be earned by USING the product, not by calling an internal API.

The engine was correct after the earlier fix, but nothing awarded a badge in
practice, because three failures stacked:

  1. cleaner_profiles.completed_jobs was never incremented by anything — only
     set by the demo seeder — so every count-based criterion was frozen at 0.
  2. Evaluation was dispatched to a Celery task whose body called
     evaluate_user(user_id) against a (user_id, db) signature: TypeError,
     swallowed by its own except block.
  3. That task only ran at all if a broker happened to be up.

So a cleaner could finish twenty jobs and never see "First Job". These tests
drive the real endpoints and assert the badge lands.
"""
import uuid

import pytest

from app.database import db
from app.services.badge_engine import badge_engine
from tests.money_helpers import make_admin, make_job, make_user


async def _seed_badges():
    await badge_engine.seed_badges(db)


async def _held_badge_names(user_id: str):
    return {b["name"] for b in await badge_engine.get_user_badges(user_id, db)}


@pytest.mark.asyncio
async def test_completing_a_job_awards_the_first_job_badge(client):
    """The end-to-end promise: finish a job, earn the badge."""
    await _seed_badges()
    client_h, _, client_profile = await make_user(client, "client")
    cleaner_h, cleaner_user_id, cleaner_profile = await make_user(client, "cleaner")

    job = await make_job(
        client_profile, cleaner_profile, status="in_progress", payment_status="held"
    )

    assert "First Job" not in await _held_badge_names(cleaner_user_id)

    resp = await client.post(f"/api/v1/jobs/{job['id']}/complete", headers=cleaner_h)
    assert resp.status_code == 200, resp.text

    assert "First Job" in await _held_badge_names(cleaner_user_id), (
        "completing a job did not award First Job — the award path is broken"
    )


@pytest.mark.asyncio
async def test_completing_a_job_syncs_the_completed_jobs_counter(client):
    """The counter every count-based criterion reads must actually move."""
    await _seed_badges()
    _, _, client_profile = await make_user(client, "client")
    cleaner_h, _, cleaner_profile = await make_user(client, "cleaner")

    before = (await db.cleaner.find_unique(where={"id": cleaner_profile}))["completed_jobs"]
    assert (before or 0) == 0

    job = await make_job(client_profile, cleaner_profile, status="in_progress")
    resp = await client.post(f"/api/v1/jobs/{job['id']}/complete", headers=cleaner_h)
    assert resp.status_code == 200, resp.text

    after = (await db.cleaner.find_unique(where={"id": cleaner_profile}))["completed_jobs"]
    assert after == 1, f"completed_jobs stayed at {after}"


@pytest.mark.asyncio
async def test_counter_is_a_recount_not_an_increment(client):
    """Recounting is idempotent; incrementing double-counts on a retry."""
    await _seed_badges()
    _, _, client_profile = await make_user(client, "client")
    cleaner_h, _, cleaner_profile = await make_user(client, "cleaner")

    for _ in range(3):
        job = await make_job(client_profile, cleaner_profile, status="in_progress")
        resp = await client.post(f"/api/v1/jobs/{job['id']}/complete", headers=cleaner_h)
        assert resp.status_code == 200, resp.text

    row = await db.cleaner.find_unique(where={"id": cleaner_profile})
    assert row["completed_jobs"] == 3, (
        f"expected exactly 3 completed jobs, got {row['completed_jobs']}"
    )


@pytest.mark.asyncio
async def test_a_second_completion_does_not_duplicate_the_badge(client):
    await _seed_badges()
    _, _, client_profile = await make_user(client, "client")
    cleaner_h, cleaner_user_id, cleaner_profile = await make_user(client, "cleaner")

    for _ in range(2):
        job = await make_job(client_profile, cleaner_profile, status="in_progress")
        await client.post(f"/api/v1/jobs/{job['id']}/complete", headers=cleaner_h)

    held = [b["name"] for b in await badge_engine.get_user_badges(cleaner_user_id, db)]
    assert held.count("First Job") == 1, f"duplicate badges: {held}"


@pytest.mark.asyncio
async def test_admin_completing_via_status_route_also_awards(client):
    """Badges must not depend on which endpoint the completion came through."""
    await _seed_badges()
    _, _, client_profile = await make_user(client, "client")
    _, cleaner_user_id, cleaner_profile = await make_user(client, "cleaner")
    admin_h, _ = await make_admin(client)

    job = await make_job(client_profile, cleaner_profile, status="in_progress")
    resp = await client.patch(
        f"/api/v1/jobs/{job['id']}/status",
        json={"status": "completed"},
        headers=admin_h,
    )
    assert resp.status_code == 200, resp.text

    assert "First Job" in await _held_badge_names(cleaner_user_id)


@pytest.mark.asyncio
async def test_badge_failure_never_blocks_job_completion(client, monkeypatch):
    """A badge is a nice-to-have; finishing a job is not.

    #8 — stability first. Nothing in the badge path may turn a completed job
    into an error for the cleaner.
    """
    await _seed_badges()
    _, _, client_profile = await make_user(client, "client")
    cleaner_h, _, cleaner_profile = await make_user(client, "cleaner")
    job = await make_job(client_profile, cleaner_profile, status="in_progress")

    async def boom(*args, **kwargs):
        raise RuntimeError("badge engine exploded")

    monkeypatch.setattr(badge_engine, "evaluate_user", boom)

    resp = await client.post(f"/api/v1/jobs/{job['id']}/complete", headers=cleaner_h)
    assert resp.status_code == 200, (
        "a badge-engine failure broke job completion — that inverts the priority"
    )

    row = await db.job.find_unique(where={"id": job["id"]})
    assert row["status"] == "completed"


@pytest.mark.asyncio
async def test_public_badges_endpoint_serves_what_was_earned(client):
    """The endpoint the UI reads must return the earned badges."""
    await _seed_badges()
    _, _, client_profile = await make_user(client, "client")
    cleaner_h, cleaner_user_id, cleaner_profile = await make_user(client, "cleaner")

    job = await make_job(client_profile, cleaner_profile, status="in_progress")
    await client.post(f"/api/v1/jobs/{job['id']}/complete", headers=cleaner_h)

    # Public: no auth header.
    resp = await client.get(f"/api/v1/verification/badges/{cleaner_user_id}")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["count"] >= 1
    names = {b["name"] for b in body["badges"]}
    assert "First Job" in names
    # The UI needs these fields to render a badge.
    for badge in body["badges"]:
        assert badge.get("name")
        assert "description" in badge
        assert "icon_url" in badge


@pytest.mark.asyncio
async def test_concurrent_evaluation_awards_each_badge_once(client):
    """Two evaluations at the same time must not both insert.

    The award path was a read-then-write race with nothing enforcing
    uniqueness: both callers read "not awarded yet" and both inserted. Found by
    LOOKING at the rendered profile — parallel e2e requests had produced FOUR
    copies of every badge and a "+12" overflow against a seven-badge
    catalogue. A sequential test cannot see this.
    """
    import asyncio

    await _seed_badges()
    _, _, client_profile = await make_user(client, "client")
    cleaner_h, cleaner_user_id, cleaner_profile = await make_user(client, "cleaner")

    job = await make_job(client_profile, cleaner_profile, status="in_progress")
    await client.post(f"/api/v1/jobs/{job['id']}/complete", headers=cleaner_h)

    # Fire several evaluations concurrently.
    await asyncio.gather(
        *(badge_engine.evaluate_user(cleaner_user_id, db) for _ in range(5)),
        return_exceptions=True,
    )

    held = [b["name"] for b in await badge_engine.get_user_badges(cleaner_user_id, db)]
    assert len(held) == len(set(held)), f"duplicate badges after concurrent runs: {held}"


@pytest.mark.asyncio
async def test_a_user_cannot_hold_more_badges_than_the_catalogue(client):
    """A simple invariant that duplicates would violate immediately."""
    from app.services.badge_engine import DEFAULT_BADGES

    await _seed_badges()
    _, _, client_profile = await make_user(client, "client")
    cleaner_h, cleaner_user_id, cleaner_profile = await make_user(client, "cleaner")

    for _ in range(3):
        job = await make_job(client_profile, cleaner_profile, status="in_progress")
        await client.post(f"/api/v1/jobs/{job['id']}/complete", headers=cleaner_h)
        await badge_engine.evaluate_user(cleaner_user_id, db)

    held = await badge_engine.get_user_badges(cleaner_user_id, db)
    assert len(held) <= len(DEFAULT_BADGES), (
        f"holding {len(held)} badges against a catalogue of {len(DEFAULT_BADGES)}"
    )


@pytest.mark.asyncio
async def test_clients_do_not_accumulate_cleaner_badges(client):
    """Completing a job must not award anything to the client side."""
    await _seed_badges()
    client_h, client_user_id, client_profile = await make_user(client, "client")
    cleaner_h, _, cleaner_profile = await make_user(client, "cleaner")

    job = await make_job(client_profile, cleaner_profile, status="in_progress")
    await client.post(f"/api/v1/jobs/{job['id']}/complete", headers=cleaner_h)

    assert await _held_badge_names(client_user_id) == set()
