"""gap closure: phone attempts, bid unique, review metadata

Revision ID: 6cb91d6bf6de
Revises: d1da7d8ed87d
Create Date: 2026-07-10 18:05:55.164039
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision: str = '6cb91d6bf6de'
down_revision: Union[str, None] = 'd1da7d8ed87d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # New columns. `attempts` is NOT NULL, so give it a server_default so the
    # ALTER succeeds against tables that already have rows.
    op.add_column(
        'phone_verifications',
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column('reviews', sa.Column('review_metadata', sa.JSON(), nullable=True))

    # De-duplicate any existing (job_id, cleaner_id) bids BEFORE adding the
    # unique constraint, keeping the earliest row per pair — otherwise the
    # constraint creation fails on a DB that already has duplicates.
    op.execute(
        """
        DELETE FROM bids
        WHERE id NOT IN (
            SELECT keep_id FROM (
                SELECT MIN(created_at || id) AS _k, MIN(id) AS keep_id
                FROM bids GROUP BY job_id, cleaner_id
            )
        )
        """
    )

    # SQLite can't ALTER TABLE ADD CONSTRAINT — use batch mode (table recreate);
    # this is a no-op wrapper on Postgres.
    with op.batch_alter_table('bids', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_bid_job_cleaner', ['job_id', 'cleaner_id'])


def downgrade() -> None:
    with op.batch_alter_table('bids', schema=None) as batch_op:
        batch_op.drop_constraint('uq_bid_job_cleaner', type_='unique')
    op.drop_column('reviews', 'review_metadata')
    op.drop_column('phone_verifications', 'attempts')
