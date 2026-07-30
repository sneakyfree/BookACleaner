"""
Badge Engine Service for BookACleaner.ai
Evaluates and awards badges to users based on their activity.
Closes Gap C-REV-4 from implementation plan.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Default badge definitions (seeded on first run)
DEFAULT_BADGES = [
    {"name": "Five Star", "description": "Maintained 4.8+ rating with 10+ reviews", "criteria_type": "avg_rating_min", "criteria_value": 4.8, "icon_url": "/badges/five-star.svg"},
    {"name": "Verified Pro", "description": "Reached Tier 5 verification", "criteria_type": "verification_tier", "criteria_value": 5, "icon_url": "/badges/verified-pro.svg"},
    {"name": "Speed Demon", "description": "Completed 10+ express cleaning jobs", "criteria_type": "express_jobs", "criteria_value": 10, "icon_url": "/badges/speed-demon.svg"},
    {"name": "Repeat Favorite", "description": "Hired by 5+ repeat clients", "criteria_type": "repeat_clients", "criteria_value": 5, "icon_url": "/badges/repeat-favorite.svg"},
    {"name": "First Job", "description": "Completed your first cleaning job", "criteria_type": "completed_jobs", "criteria_value": 1, "icon_url": "/badges/first-job.svg"},
    {"name": "Top Rated", "description": "In the top 10% of all cleaners by rating", "criteria_type": "top_percentile", "criteria_value": 10, "icon_url": "/badges/top-rated.svg"},
    # RETIRED 2026-07-29: "Community Star" — "Received 10+ likes on community
    # posts". Nobody could ever earn it, and not because of a bug: feed items
    # are platform announcements and POST /api/v1/feed is admin-only by design,
    # so users cannot author a post for anyone to like. feed_items has no author
    # column to attribute a received like to.
    #
    # The premise contradicted a deliberate product decision, so the choice was
    # retire it or build a social feed into a cleaning marketplace. The latter is
    # the feature-bloat this project is meant to resist. Migration
    # b2d4a6c8e0f1 removes the seeded row.
    {"name": "Early Adopter", "description": "Among the first 100 users to sign up", "criteria_type": "early_adopter", "criteria_value": 100, "icon_url": "/badges/early-adopter.svg"},
]


# Criteria _check_criteria actually implements. Anything outside this set can
# never be awarded, so an unknown value is logged rather than silently ignored.
_KNOWN_CRITERIA = {
    "completed_jobs",
    "avg_rating_min",
    "verification_tier",
    "express_jobs",
    "repeat_clients",
    "early_adopter",
    "top_percentile",
}


class BadgeEngine:
    """Evaluates badge criteria and awards badges to users."""

    async def seed_badges(self, db) -> int:
        """Seed default badges if they don't exist."""
        created = 0
        for badge_def in DEFAULT_BADGES:
            existing = await db.execute(
                "SELECT id FROM badges WHERE name = :name",
                {"name": badge_def["name"]}
            )
            if not existing:
                from app.models import generate_uuid
                badge_id = generate_uuid()
                await db.execute(
                    """INSERT INTO badges (id, name, description, icon_url, criteria_type, criteria_value, created_at)
                       VALUES (:id, :name, :desc, :icon, :ctype, :cval, :now)""",
                    {"id": badge_id, "name": badge_def["name"], "desc": badge_def["description"],
                     "icon": badge_def["icon_url"], "ctype": badge_def["criteria_type"],
                     "cval": badge_def["criteria_value"], "now": datetime.now(timezone.utc)}
                )
                created += 1
        return created

    async def evaluate_user(self, user_id: str, db) -> List[Dict]:
        """Evaluate all badge criteria for a user and award any earned badges."""
        awarded = []

        # Get user data
        user = await db.user.find_unique(where={"id": user_id})
        if not user:
            return awarded

        # Get all badges
        badges = await db.execute("SELECT * FROM badges")
        if not badges:
            return awarded

        # Get already awarded badges.
        # NOTE: the bind key must match the ':uid' placeholder. It said
        # "user_id", so every call raised
        #   InvalidRequestError: A value is required for bind parameter 'uid'
        # — which meant the badge engine had never awarded a badge to anyone.
        # reviews.py swallowed the exception into a log line, so the failure
        # was invisible; the /verification/badges endpoints just 500'd.
        existing_badges = await db.execute(
            "SELECT badge_id FROM user_badges WHERE user_id = :uid",
            {"uid": user_id}
        )
        awarded_ids = {b["badge_id"] for b in (existing_badges or [])}

        # Get cleaner profile if exists
        cleaner = None
        if user.get("role") == "cleaner":
            cleaner = await db.cleaner.find_first(where={"user_id": user_id})

        for badge in (badges or []):
            if badge["id"] in awarded_ids:
                continue

            earned = await self._check_criteria(badge, user, cleaner, db)
            if earned:
                from app.models import generate_uuid

                try:
                    await db.execute(
                        """INSERT INTO user_badges (id, user_id, badge_id, awarded_at, awarded_reason)
                           VALUES (:id, :uid, :bid, :now, :reason)""",
                        {"id": generate_uuid(), "uid": user_id, "bid": badge["id"],
                         "now": datetime.now(timezone.utc), "reason": f"Earned: {badge['name']}"}
                    )
                except IntegrityError:
                    # Lost a race against a concurrent evaluation. The unique
                    # constraint (uq_user_badge) is what actually guarantees one
                    # badge per user; the awarded_ids check above is only an
                    # optimisation, and check-then-insert is not atomic. Losing
                    # here means the badge IS awarded, so carry on rather than
                    # aborting the remaining criteria.
                    logger.debug(
                        "Badge '%s' already awarded to %s concurrently",
                        badge["name"],
                        user_id,
                    )
                    continue

                awarded.append({"badge_id": badge["id"], "name": badge["name"]})
                logger.info(f"Awarded badge '{badge['name']}' to user {user_id}")

        return awarded

    async def _check_criteria(self, badge: Dict, user: Dict, cleaner: Optional[Dict], db) -> bool:
        """Check if a user meets the criteria for a specific badge."""
        criteria_type = badge.get("criteria_type")
        criteria_value = badge.get("criteria_value", 0)

        if criteria_type == "completed_jobs" and cleaner:
            return (cleaner.get("completed_jobs") or 0) >= criteria_value

        elif criteria_type == "avg_rating_min" and cleaner:
            return (
                (cleaner.get("rating") or 0) >= criteria_value and
                (cleaner.get("review_count") or 0) >= 10
            )

        elif criteria_type == "verification_tier" and cleaner:
            return (cleaner.get("verification_tier") or 1) >= criteria_value

        elif criteria_type == "express_jobs" and cleaner:
            jobs = await db.job.find_many(where={
                "cleaner_id": cleaner["id"],
                "status": "completed",
            })
            express = [j for j in (jobs or []) if "express" in (j.get("services") or [])]
            return len(express) >= criteria_value

        elif criteria_type == "repeat_clients" and cleaner:
            jobs = await db.job.find_many(where={
                "cleaner_id": cleaner["id"],
                "status": "completed",
            })
            client_counts = {}
            for j in (jobs or []):
                cid = j.get("client_id")
                if cid:
                    client_counts[cid] = client_counts.get(cid, 0) + 1
            repeats = sum(1 for c in client_counts.values() if c >= 2)
            return repeats >= criteria_value

        elif criteria_type == "early_adopter":
            # "Among the first N users to sign up" needs an ORDER BY and a
            # LIMIT. This used to call find_many(take=N) — but find_many
            # ignored unknown kwargs, so it fetched EVERY user unordered and
            # the membership test was trivially true for everyone. The badge
            # would have gone to the entire user base (had the engine run).
            rows = await db.execute(
                "SELECT id FROM users ORDER BY created_at ASC LIMIT :n",
                {"n": int(criteria_value)},
            )
            return user["id"] in {r["id"] for r in (rows or [])}

        elif criteria_type == "top_percentile":
            # Top X% of cleaners by rating. Only rated cleaners are ranked —
            # otherwise a field of unrated profiles makes any rating "top".
            if not cleaner:
                return False
            my_rating = cleaner.get("rating") or 0
            if my_rating <= 0:
                return False
            rows = await db.execute(
                "SELECT rating FROM cleaner_profiles WHERE rating > 0"
            )
            ratings = sorted(
                (r["rating"] or 0 for r in (rows or [])), reverse=True
            )
            if not ratings:
                return False
            cutoff_index = max(1, int(len(ratings) * (float(criteria_value) / 100.0)))
            cutoff_rating = ratings[min(cutoff_index, len(ratings)) - 1]
            return my_rating >= cutoff_rating

        # An unrecognised criteria_type is now a warning, not a silent False.
        # A badge sitting in the catalogue that quietly awards to nobody is
        # exactly how 'top_percentile' and 'feed_likes' went unnoticed.
        if criteria_type not in _KNOWN_CRITERIA:
            logger.warning(
                "Badge '%s' has unknown criteria_type '%s' — it can never be "
                "awarded. Implement it or remove the badge.",
                badge.get("name"),
                criteria_type,
            )
        return False

    async def get_user_badges(self, user_id: str, db) -> List[Dict]:
        """Get all badges for a user."""
        # Bind key must match ':uid' — see evaluate_user. This raised on every
        # call, so GET /verification/badges/{user_id} was a hard 500.
        results = await db.execute(
            """SELECT ub.awarded_at, ub.awarded_reason, b.name, b.description, b.icon_url
               FROM user_badges ub JOIN badges b ON ub.badge_id = b.id
               WHERE ub.user_id = :uid ORDER BY ub.awarded_at DESC""",
            {"uid": user_id}
        )
        return results or []


badge_engine = BadgeEngine()
