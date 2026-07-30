"""one badge per user: dedupe user_badges and add a unique constraint

`badge_engine.evaluate_user` read the set of already-awarded badge ids and then
inserted the missing ones. With nothing enforcing uniqueness that is a
read-then-write race: two concurrent evaluations both saw "not awarded yet" and
both inserted. Observed live — parallel requests produced FOUR copies of every
badge, and the public profile rendered them as a wall of duplicate icons with a
"+12" overflow against a catalogue of only seven.

Keeps the earliest award per (user_id, badge_id) — that is when the user
actually earned it — and drops the rest.

Revision ID: c3e5b7d9f2a4
Revises: b2d4a6c8e0f1
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c3e5b7d9f2a4"
down_revision: Union[str, None] = "b2d4a6c8e0f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CONSTRAINT = "uq_user_badge"


def upgrade() -> None:
    bind = op.get_bind()

    # Dedupe first — the constraint cannot be created over existing duplicates.
    # Written with a correlated subquery rather than a CTE/window so it runs on
    # both PostgreSQL and SQLite.
    op.execute(
        sa.text(
            """
            DELETE FROM user_badges
            WHERE id NOT IN (
                SELECT keep_id FROM (
                    SELECT MIN(id) AS keep_id
                    FROM user_badges
                    GROUP BY user_id, badge_id
                ) AS keepers
            )
            """
        )
    )

    if bind.dialect.name == "sqlite":
        # SQLite cannot ADD CONSTRAINT; batch mode rebuilds the table.
        with op.batch_alter_table("user_badges") as batch:
            batch.create_unique_constraint(CONSTRAINT, ["user_id", "badge_id"])
    else:
        op.create_unique_constraint(CONSTRAINT, "user_badges", ["user_id", "badge_id"])


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("user_badges") as batch:
            batch.drop_constraint(CONSTRAINT, type_="unique")
    else:
        op.drop_constraint(CONSTRAINT, "user_badges", type_="unique")
