"""retire the Community Star badge

"Received 10+ likes on community posts" could never be earned by anyone, and
not because of a bug: feed items are platform announcements, POST /api/v1/feed
is admin-only by design, and feed_items has no author column to attribute a
received like to. Users cannot author a post for anyone to like.

The premise contradicted a deliberate product decision, so the options were
retire the badge or build a social feed into a cleaning marketplace. Retired.

Removes the seeded row (and defensively any user_badges rows pointing at it —
there should be none, since the criteria never returned True and the engine
raised on every call before 2026-07-29, but the FK must be clear either way).

Idempotent and safe on a database that never seeded badges.

Revision ID: b2d4a6c8e0f1
Revises: a1c3f5e7b9d2
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b2d4a6c8e0f1"
down_revision: Union[str, None] = "a1c3f5e7b9d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


RETIRED_BADGE_NAME = "Community Star"
RETIRED_CRITERIA = "feed_likes"


def upgrade() -> None:
    bind = op.get_bind()

    # Match on criteria_type as well as name: a rename would otherwise leave
    # the unearnable badge behind.
    op.execute(
        sa.text(
            """
            DELETE FROM user_badges
            WHERE badge_id IN (
                SELECT id FROM badges
                WHERE name = :name OR criteria_type = :criteria
            )
            """
        ).bindparams(name=RETIRED_BADGE_NAME, criteria=RETIRED_CRITERIA)
    )
    op.execute(
        sa.text(
            "DELETE FROM badges WHERE name = :name OR criteria_type = :criteria"
        ).bindparams(name=RETIRED_BADGE_NAME, criteria=RETIRED_CRITERIA)
    )


def downgrade() -> None:
    """Restore the row so a rollback is faithful.

    It remains unearnable — _check_criteria has no branch for feed_likes and
    will log that it can never be awarded. Restoring the data is the honest
    downgrade; re-adding the capability is not something a migration can do.
    """
    bind = op.get_bind()
    now_fn = "NOW()" if bind.dialect.name == "postgresql" else "CURRENT_TIMESTAMP"
    op.execute(
        sa.text(
            f"""
            INSERT INTO badges (id, name, description, icon_url, criteria_type,
                                criteria_value, created_at)
            SELECT :id, :name, :desc, :icon, :criteria, :value, {now_fn}
            WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = :name)
            """
        ).bindparams(
            id="badge-community-star-restored",
            name=RETIRED_BADGE_NAME,
            desc="Received 10+ likes on community posts",
            icon="/badges/community-star.svg",
            criteria=RETIRED_CRITERIA,
            value=10,
        )
    )
