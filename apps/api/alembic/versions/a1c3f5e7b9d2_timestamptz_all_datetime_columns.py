"""timestamptz: make all datetime columns timezone-aware

The ORM writes timezone-AWARE datetimes (``datetime.now(timezone.utc)``) but
every DateTime column was declared naive, so PostgreSQL rendered them as
TIMESTAMP WITHOUT TIME ZONE and asyncpg raised::

    DataError: invalid input for query argument $N:
    can't subtract offset-naive and offset-aware datetimes

That made the API unable to boot, register a user, or run a single test
against PostgreSQL. SQLite is permissive about the mix, so the SQLite-only
test suite never caught it.

This converts every datetime column to TIMESTAMPTZ. Existing naive values are
interpreted as UTC (which is what the application always intended — it has
only ever written ``datetime.now(timezone.utc)``).

No-op on SQLite, which has no native timestamptz type and cannot ALTER COLUMN.

Revision ID: a1c3f5e7b9d2
Revises: 646b06b4eae6
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a1c3f5e7b9d2"
down_revision: Union[str, None] = "646b06b4eae6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (table, column) for every DateTime column in app/models.py
DATETIME_COLUMNS = [
    ("users", "email_verified_at"),
    ("users", "phone_verified_at"),
    ("users", "refresh_token_expires_at"),
    ("users", "created_at"),
    ("users", "updated_at"),
    ("cleaner_profiles", "created_at"),
    ("cleaner_profiles", "updated_at"),
    ("client_profiles", "created_at"),
    ("client_profiles", "updated_at"),
    ("properties", "created_at"),
    ("properties", "updated_at"),
    ("jobs", "scheduled_date"),
    ("jobs", "paid_at"),
    ("jobs", "paid_out_at"),
    ("jobs", "started_at"),
    ("jobs", "completed_at"),
    ("jobs", "created_at"),
    ("jobs", "updated_at"),
    ("reviews", "responded_at"),
    ("reviews", "moderated_at"),
    ("reviews", "created_at"),
    ("reviews", "updated_at"),
    ("conversations", "created_at"),
    ("conversations", "updated_at"),
    ("conversations", "last_message_at"),
    ("conversation_participants", "last_read_at"),
    ("messages", "created_at"),
    ("messages", "delivered_at"),
    ("messages", "read_at"),
    ("verifications", "verified_at"),
    ("verifications", "expires_at"),
    ("verifications", "created_at"),
    ("verifications", "updated_at"),
    ("certifications", "issued_date"),
    ("certifications", "expires_at"),
    ("certifications", "verified_at"),
    ("certifications", "created_at"),
    ("certifications", "updated_at"),
    ("password_resets", "expires_at"),
    ("password_resets", "used_at"),
    ("password_resets", "created_at"),
    ("email_verifications", "expires_at"),
    ("email_verifications", "verified_at"),
    ("email_verifications", "created_at"),
    ("phone_verifications", "expires_at"),
    ("phone_verifications", "verified_at"),
    ("phone_verifications", "created_at"),
    ("notifications", "read_at"),
    ("notifications", "created_at"),
    ("bids", "accepted_at"),
    ("bids", "declined_at"),
    ("bids", "withdrawn_at"),
    ("bids", "created_at"),
    ("bids", "updated_at"),
    ("badges", "created_at"),
    ("user_badges", "awarded_at"),
    ("disputes", "created_at"),
    ("disputes", "resolved_at"),
    ("disputes", "updated_at"),
    ("subscriptions", "current_period_start"),
    ("subscriptions", "current_period_end"),
    ("subscriptions", "created_at"),
    ("subscriptions", "updated_at"),
    ("flagged_content", "reviewed_at"),
    ("flagged_content", "created_at"),
    ("feed_items", "created_at"),
    ("approval_queue_items", "expires_at"),
    ("approval_queue_items", "reviewed_at"),
    ("approval_queue_items", "created_at"),
    ("approval_queue_items", "updated_at"),
    ("sponsored_listings", "starts_at"),
    ("sponsored_listings", "expires_at"),
    ("sponsored_listings", "created_at"),
    ("sponsored_listings", "updated_at"),
    ("service_agreements", "accepted_at"),
    ("service_agreements", "created_at"),
    ("availability", "created_at"),
    ("availability", "updated_at"),
    ("portfolio_photos", "created_at"),
    ("property_playbooks", "created_at"),
    ("property_playbooks", "updated_at"),
    ("service_categories", "created_at"),
    ("services", "created_at"),
    ("cleaner_services", "created_at"),
    ("feed_likes", "created_at"),
    ("audit_logs", "created_at"),
    ("support_tickets", "created_at"),
    ("support_tickets", "updated_at"),
    ("support_messages", "created_at"),
    ("page_views", "created_at"),
]


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        # SQLite stores datetimes as text and has no ALTER COLUMN TYPE.
        return
    for table, column in DATETIME_COLUMNS:
        op.execute(
            f'ALTER TABLE {table} ALTER COLUMN {column} TYPE TIMESTAMPTZ '
            f"USING {column} AT TIME ZONE 'UTC'"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for table, column in DATETIME_COLUMNS:
        op.execute(
            f'ALTER TABLE {table} ALTER COLUMN {column} TYPE TIMESTAMP '
            f"USING {column} AT TIME ZONE 'UTC'"
        )
