"""Badge engine.

This service was 19% covered and had never awarded a badge to anyone: every
call to evaluate_user raised `A value is required for bind parameter 'uid'`
because the query used :uid and the params dict used "user_id". reviews.py
swallowed that into a log line and the /verification/badges endpoints 500'd, so
a whole gamification feature was dead in a way nothing surfaced.

These tests assert badges are actually EARNED and WITHHELD on the right
criteria — not merely that the call returns without raising.
"""
import uuid

import pytest

from app.database import db
from app.services.badge_engine import DEFAULT_BADGES, badge_engine


async def _seed_badges():
    await badge_engine.seed_badges(db)


async def _make_cleaner(**profile):
    """A cleaner user + profile with the given stats."""
    user = await db.user.create(
        data={
            "email": f"badge-{uuid.uuid4().hex[:10]}@test.com",
            "password_hash": "x",
            "role": "cleaner",
            "full_name": "Badge Cleaner",
        }
    )
    defaults = {
        "user_id": user["id"],
        "business_name": "Badge Co",
        "completed_jobs": 0,
        "rating": 0.0,
        "review_count": 0,
        "verification_tier": 1,
    }
    defaults.update(profile)
    cleaner = await db.cleaner.create(data=defaults)
    return user, cleaner


def _names(awarded):
    return {a["name"] for a in awarded}


# ── the crash that made this feature dead ─────────────────────────────────


@pytest.mark.asyncio
async def test_evaluate_user_does_not_raise(client):
    """The regression that mattered: this used to raise on every single call."""
    await _seed_badges()
    user, _ = await _make_cleaner()
    awarded = await badge_engine.evaluate_user(user["id"], db)
    assert isinstance(awarded, list)


@pytest.mark.asyncio
async def test_get_user_badges_does_not_raise(client):
    """Same bind-parameter bug; this one surfaced as a 500 on a public route."""
    await _seed_badges()
    user, _ = await _make_cleaner()
    badges = await badge_engine.get_user_badges(user["id"], db)
    assert isinstance(badges, list)


@pytest.mark.asyncio
async def test_public_badges_endpoint_returns_200(client):
    """GET /verification/badges/{user_id} is public and used to hard-500."""
    await _seed_badges()
    user, _ = await _make_cleaner()
    resp = await client.get(f"/api/v1/verification/badges/{user['id']}")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "badges" in body and "count" in body


# ── badges are actually earned ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_first_job_badge_awarded_on_first_completed_job(client):
    await _seed_badges()
    user, _ = await _make_cleaner(completed_jobs=1)
    awarded = await badge_engine.evaluate_user(user["id"], db)
    assert "First Job" in _names(awarded), f"got {_names(awarded)}"


@pytest.mark.asyncio
async def test_first_job_badge_withheld_with_zero_jobs(client):
    await _seed_badges()
    user, _ = await _make_cleaner(completed_jobs=0)
    awarded = await badge_engine.evaluate_user(user["id"], db)
    assert "First Job" not in _names(awarded)


@pytest.mark.asyncio
async def test_verified_pro_requires_tier_5(client):
    await _seed_badges()
    low, _ = await _make_cleaner(verification_tier=4)
    high, _ = await _make_cleaner(verification_tier=5)

    assert "Verified Pro" not in _names(await badge_engine.evaluate_user(low["id"], db))
    assert "Verified Pro" in _names(await badge_engine.evaluate_user(high["id"], db))


@pytest.mark.asyncio
async def test_five_star_requires_both_rating_and_review_count(client):
    """4.8+ rating AND 10+ reviews — a perfect score from 2 reviews is not it."""
    await _seed_badges()
    few_reviews, _ = await _make_cleaner(rating=5.0, review_count=2)
    low_rating, _ = await _make_cleaner(rating=4.5, review_count=50)
    earned, _ = await _make_cleaner(rating=4.9, review_count=12)

    assert "Five Star" not in _names(await badge_engine.evaluate_user(few_reviews["id"], db))
    assert "Five Star" not in _names(await badge_engine.evaluate_user(low_rating["id"], db))
    assert "Five Star" in _names(await badge_engine.evaluate_user(earned["id"], db))


@pytest.mark.asyncio
async def test_badges_are_not_awarded_twice(client):
    """Re-evaluating must be idempotent — no duplicate user_badges rows."""
    await _seed_badges()
    user, _ = await _make_cleaner(completed_jobs=5, verification_tier=5)

    first = await badge_engine.evaluate_user(user["id"], db)
    assert first, "expected at least one badge on the first pass"

    second = await badge_engine.evaluate_user(user["id"], db)
    assert second == [], f"re-awarded on second pass: {_names(second)}"

    held = await badge_engine.get_user_badges(user["id"], db)
    names = [b["name"] for b in held]
    assert len(names) == len(set(names)), f"duplicate badges: {names}"


@pytest.mark.asyncio
async def test_awarded_badges_are_readable_back(client):
    """What evaluate_user awards must show up in get_user_badges."""
    await _seed_badges()
    user, _ = await _make_cleaner(completed_jobs=1)
    awarded = await badge_engine.evaluate_user(user["id"], db)
    assert awarded

    held = {b["name"] for b in await badge_engine.get_user_badges(user["id"], db)}
    assert _names(awarded) <= held


@pytest.mark.asyncio
async def test_clients_do_not_earn_cleaner_badges(client):
    """Cleaner-only criteria must not fire for a client account."""
    await _seed_badges()
    user = await db.user.create(
        data={
            "email": f"badge-client-{uuid.uuid4().hex[:8]}@test.com",
            "password_hash": "x",
            "role": "client",
            "full_name": "Badge Client",
        }
    )
    awarded = _names(await badge_engine.evaluate_user(user["id"], db))
    assert "First Job" not in awarded
    assert "Verified Pro" not in awarded
    assert "Five Star" not in awarded


@pytest.mark.asyncio
async def test_unknown_user_awards_nothing(client):
    await _seed_badges()
    assert await badge_engine.evaluate_user("no-such-user", db) == []


# ── repeat-client criterion ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_repeat_favorite_counts_distinct_returning_clients(client):
    """5 repeat clients means 5 clients who booked twice — not 5 jobs."""
    await _seed_badges()
    user, cleaner = await _make_cleaner()

    # One client booking six times is ONE repeat client, not six.
    client_user = await db.user.create(
        data={
            "email": f"repeat-{uuid.uuid4().hex[:8]}@test.com",
            "password_hash": "x",
            "role": "client",
            "full_name": "Repeat Client",
        }
    )
    profile = await db.client.create(data={"user_id": client_user["id"]})
    for _ in range(6):
        await db.job.create(
            data={
                "title": "Repeat job",
                "client_id": profile["id"],
                "cleaner_id": cleaner["id"],
                "status": "completed",
                "total_price": 100.0,
            }
        )

    awarded = _names(await badge_engine.evaluate_user(user["id"], db))
    assert "Repeat Favorite" not in awarded, (
        "one client booking six times was counted as six repeat clients"
    )


# ── criteria coverage ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_early_adopter_is_bounded_to_the_first_n_signups(client):
    """The limit must actually apply.

    find_many(take=N) silently ignored `take` and returned the whole users
    table, so the membership test was true for everybody — the badge would
    have gone to the entire user base.
    """
    # Use a threshold of 2 so the test controls the boundary regardless of how
    # many users other tests happened to create.
    tiny_badge = {"name": "Early (test)", "criteria_type": "early_adopter", "criteria_value": 2}

    existing = await db.execute("SELECT id FROM users ORDER BY created_at ASC LIMIT 2")
    earliest_ids = {r["id"] for r in (existing or [])}

    latecomer, latecomer_profile = await _make_cleaner()
    assert latecomer["id"] not in earliest_ids

    earned = await badge_engine._check_criteria(
        tiny_badge, latecomer, latecomer_profile, db
    )
    assert earned is False, (
        "a late signup satisfied early_adopter — the LIMIT is not being applied "
        "(find_many(take=N) used to return the whole table)"
    )

    # ...and someone genuinely in the first N does satisfy it.
    if earliest_ids:
        first_user = await db.user.find_unique(where={"id": list(earliest_ids)[0]})
        assert await badge_engine._check_criteria(tiny_badge, first_user, None, db) is True


@pytest.mark.asyncio
async def test_every_seeded_criteria_type_is_handled(client):
    """No badge may sit in the catalogue with logic that never runs.

    'top_percentile' and 'feed_likes' both fell through to `return False`, so
    Top Rated and Community Star could never be earned by anyone. This is the
    guard that stops a ninth badge shipping the same way.
    """
    from app.services.badge_engine import _KNOWN_CRITERIA

    unhandled = [
        b["criteria_type"]
        for b in DEFAULT_BADGES
        if b["criteria_type"] not in _KNOWN_CRITERIA
    ]
    assert not unhandled, (
        f"criteria with no implementation: {unhandled} — implement them in "
        "_check_criteria (and add to _KNOWN_CRITERIA) or remove the badge"
    )


@pytest.mark.asyncio
async def test_community_star_is_retired(client):
    """The unearnable badge must not come back.

    'Received 10+ likes on community posts' cannot be satisfied: feed items are
    platform announcements, POST /api/v1/feed is admin-only, and feed_items has
    no author column. Retired rather than growing a social feed to justify it.
    """
    assert not any(b["name"] == "Community Star" for b in DEFAULT_BADGES)
    assert not any(b["criteria_type"] == "feed_likes" for b in DEFAULT_BADGES)

    # And seeding must not reintroduce the row.
    await badge_engine.seed_badges(db)
    rows = await db.execute("SELECT name, criteria_type FROM badges")
    names = {r["name"] for r in rows}
    criteria = {r["criteria_type"] for r in rows}
    assert "Community Star" not in names
    assert "feed_likes" not in criteria


@pytest.mark.asyncio
async def test_unknown_criteria_is_logged_not_silently_ignored(client, caplog):
    """A badge that can never be awarded must announce itself.

    Silence is how the two broken criteria survived for months.
    """
    import logging

    fake_badge = {
        "id": "fake",
        "name": "Impossible Badge",
        "criteria_type": "not_a_real_criterion",
        "criteria_value": 1,
    }
    user, cleaner = await _make_cleaner()

    with caplog.at_level(logging.WARNING, logger="app.services.badge_engine"):
        earned = await badge_engine._check_criteria(fake_badge, user, cleaner, db)

    assert earned is False
    assert any(
        "never be awarded" in r.message or "never be awarded" in r.getMessage()
        for r in caplog.records
    ), "an unimplementable badge was silently ignored"


@pytest.mark.asyncio
async def test_top_percentile_ranks_against_rated_cleaners(client):
    """Top Rated goes to the top of the field, not to everyone."""
    await _seed_badges()
    for r in [3.0, 3.4, 3.6, 3.9, 4.1]:
        await _make_cleaner(rating=r, review_count=20)
    best, _ = await _make_cleaner(rating=5.0, review_count=20)
    worst, _ = await _make_cleaner(rating=1.0, review_count=20)

    assert "Top Rated" in _names(await badge_engine.evaluate_user(best["id"], db))
    assert "Top Rated" not in _names(await badge_engine.evaluate_user(worst["id"], db))


@pytest.mark.asyncio
async def test_unrated_cleaner_is_not_top_rated(client):
    """A zero rating must not count as being at the top of the field."""
    await _seed_badges()
    unrated, _ = await _make_cleaner(rating=0.0, review_count=0)
    assert "Top Rated" not in _names(await badge_engine.evaluate_user(unrated["id"], db))


# ── seeding ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_seeding_is_idempotent(client):
    """Repeated seeding must not duplicate the badge catalogue."""
    await badge_engine.seed_badges(db)
    second = await badge_engine.seed_badges(db)
    assert second == 0, f"reseeding created {second} duplicate badges"

    rows = await db.execute("SELECT name FROM badges")
    names = [r["name"] for r in rows]
    assert len(names) == len(set(names)), f"duplicate badge rows: {names}"
