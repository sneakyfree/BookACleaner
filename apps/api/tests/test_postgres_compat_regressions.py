"""Regressions for the PostgreSQL-compatibility class of bugs (2026-07-28).

The suite ran only on SQLite, which is permissive where PostgreSQL is strict.
That hid an API which could not boot, register a user, send a message, or
complete a GDPR erasure against the database we actually deploy.

These tests pin the invariants that made those bugs possible. Several assert on
model/schema metadata rather than behaviour so they fail on ANY engine —
including the SQLite compatibility job, which cannot reproduce the underlying
violation at runtime.
"""
import pytest
from datetime import datetime, timezone

from app.models import Base
from tests.conftest import get_auth_header


def test_every_datetime_column_is_timezone_aware():
    """No naive DateTime columns.

    The app writes datetime.now(timezone.utc) everywhere. A naive column
    renders as TIMESTAMP WITHOUT TIME ZONE, and asyncpg then refuses the
    insert with "can't subtract offset-naive and offset-aware datetimes".
    All 90 columns were naive; the API could not start.
    """
    from sqlalchemy import DateTime

    naive = [
        f"{table.name}.{col.name}"
        for table in Base.metadata.sorted_tables
        for col in table.columns
        if isinstance(col.type, DateTime) and not col.type.timezone
    ]
    assert not naive, (
        f"{len(naive)} naive DateTime column(s) — these break PostgreSQL: {naive[:10]}"
    )


def test_no_naive_utcnow_in_application_code():
    """datetime.utcnow() returns a NAIVE datetime and must not reach the DB.

    Five call sites in the phone-OTP flow used it, writing naive values into
    columns the rest of the app writes as aware.
    """
    import pathlib

    app_dir = pathlib.Path(__file__).resolve().parent.parent / "app"
    offenders = [
        f"{p.relative_to(app_dir)}:{i}"
        for p in app_dir.rglob("*.py")
        for i, line in enumerate(p.read_text().splitlines(), 1)
        if "datetime.utcnow()" in line and not line.strip().startswith("#")
    ]
    assert not offenders, f"naive datetime.utcnow() found: {offenders}"


@pytest.mark.asyncio
async def test_otp_send_does_not_violate_user_fk(client):
    """Passwordless OTP is issued before any user exists.

    user_id is a FK to users.id; the old code wrote the literal string
    '__otp__', which PostgreSQL rejects outright (SQLite does not enforce FKs
    by default, so this passed for months while being broken in production).
    """
    resp = await client.post(
        "/api/v1/auth/otp/send", json={"phone": "+15551230001"}
    )
    assert resp.status_code == 200, resp.text


@pytest.mark.asyncio
async def test_send_message_rejects_unknown_recipient(client):
    """recipient_id lands in a FK column and must be validated.

    Unvalidated it created a dangling participant row on SQLite and raised a
    500 FK violation on PostgreSQL. create_conversation already validated;
    send did not.
    """
    headers = await get_auth_header(client, role="client")
    resp = await client.post(
        "/api/v1/messages/send",
        json={"recipient_id": "no-such-user-id", "content": "hello"},
        headers=headers,
    )
    assert resp.status_code == 404, resp.text


@pytest.mark.asyncio
async def test_send_message_rejects_blank_content(client):
    """Whitespace-only content previously created a real message row."""
    headers = await get_auth_header(client, role="client")
    resp = await client.post(
        "/api/v1/messages/send",
        json={"recipient_id": "anyone", "content": "   "},
        headers=headers,
    )
    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_gdpr_erasure_completes(client):
    """'Delete my account' must actually delete.

    Child rows with a FK to users (email verifications, password resets,
    subscriptions, badges, …) blocked the final DELETE, so the endpoint
    returned 500 and erased nothing — a GDPR failure, silent on SQLite.
    """
    headers = await get_auth_header(client, role="client")
    resp = await client.post(
        "/api/v1/privacy/delete",
        json={"confirm": True, "reason": "regression test"},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    assert "user_account" in resp.json()["details"]["entities_deleted"]

    # The account is gone: its token no longer resolves.
    me = await client.get("/api/v1/users/me", headers=headers)
    assert me.status_code in (401, 403, 404), me.text
