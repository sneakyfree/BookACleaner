"""Fixtures for money-path tests.

Builds real rows (users, profiles, jobs) rather than asserting on loose status
codes, so tests can check what actually happened to a payment — which status
the job landed in, what amount Stripe was asked for, whether a retry moved
money twice.
"""
import uuid
from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import bcrypt

from app.database import db, async_session_factory
from app.models import User


DEMO_PW = "TestPass123!"


def unique_email(prefix: str = "money") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}@test.com"


async def make_user(client, role: str = "client"):
    """Register a user; return (auth_header, user_id, profile_id).

    Registration auto-creates the matching client/cleaner profile row.
    """
    email = unique_email(role)
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": DEMO_PW, "role": role},
    )
    assert resp.status_code == 200, f"register failed: {resp.text}"
    body = resp.json()
    user_id = body["user"]["id"]
    header = {"Authorization": f"Bearer {body['access_token']}"}

    if role == "cleaner":
        profile = await db.cleaner.find_first(where={"user_id": user_id})
    else:
        profile = await db.client.find_first(where={"user_id": user_id})
    assert profile, f"{role} profile was not created for {user_id}"
    return header, user_id, profile["id"]


async def make_admin(client):
    """Seed an admin directly (register rejects role=admin) and log in.

    Returns (auth_header, user_id) — the id is needed to assert on admin-facing
    side effects such as dispute alerts.
    """
    email = unique_email("admin")
    user_id = str(uuid.uuid4())
    pw_hash = bcrypt.hashpw(DEMO_PW.encode(), bcrypt.gensalt()).decode()
    async with async_session_factory() as session:
        session.add(
            User(
                id=user_id,
                email=email,
                password_hash=pw_hash,
                role="admin",
                full_name="Money Test Admin",
                is_verified=True,
            )
        )
        await session.commit()
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": DEMO_PW}
    )
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}, user_id


async def make_job(
    client_profile_id: str,
    cleaner_profile_id: str | None = None,
    *,
    total_price: float = 200.0,
    status: str = "completed",
    payment_status: str = "held",
    payment_intent_id: str | None = "pi_test_default",
    paid_out_at=None,
):
    return await db.job.create(
        data={
            "title": "Money-path test job",
            "client_id": client_profile_id,
            "cleaner_id": cleaner_profile_id,
            "status": status,
            "total_price": total_price,
            "payment_status": payment_status,
            "stripe_payment_intent_id": payment_intent_id,
            "paid_out_at": paid_out_at,
        }
    )


async def job_row(job_id: str):
    return await db.job.find_unique(where={"id": job_id})


async def set_stripe_account(cleaner_profile_id: str, account_id: str = "acct_test_1"):
    await db.cleaner.update(
        where={"id": cleaner_profile_id}, data={"stripe_account_id": account_id}
    )


class StripeObj(dict):
    """Stand-in for a real ``stripe.StripeObject``.

    Stripe's objects subclass dict, so application code reaches them both ways —
    ``session.mode`` and ``session.get("payment_status")`` are both valid and
    both appear in payments.py. A plain SimpleNamespace only supports the first,
    which would make these tests pass or fail for reasons the real object never
    would.
    """

    def __getattr__(self, item):
        try:
            return self[item]
        except KeyError as exc:
            raise AttributeError(item) from exc

    def __setattr__(self, key, value):
        self[key] = value


# ── Stripe test doubles ───────────────────────────────────────────────────
#
# These assert on the ARGUMENTS the app sends to Stripe (amount, idempotency
# key), which is where the money bugs live — not just on the response code.


def fake_intent(intent_id="pi_test_1", amount=20000, status="requires_capture", job_id=None):
    m = MagicMock()
    m.id = intent_id
    m.amount = amount
    m.client_secret = f"{intent_id}_secret"
    m.status = status
    m.metadata = {"jobId": job_id} if job_id else {}
    return m


def fake_transfer(transfer_id="tr_test_1", status="paid"):
    m = MagicMock()
    m.id = transfer_id
    m.status = status
    return m


@contextmanager
def stripe_ok(*, capture_amount=20000, intent_id="pi_test_1", job_id=None):
    """Patch capture + transfer to succeed; yields the two mocks."""
    with patch("stripe.PaymentIntent.capture") as cap, patch(
        "stripe.Transfer.create"
    ) as tr:
        cap.return_value = fake_intent(
            intent_id=intent_id, amount=capture_amount, status="succeeded", job_id=job_id
        )
        tr.return_value = fake_transfer()
        yield cap, tr


@contextmanager
def stripe_transfer_fails(*, capture_amount=20000):
    """Capture SUCCEEDS, transfer FAILS — the dangerous partial-failure case."""
    import stripe as stripe_mod

    with patch("stripe.PaymentIntent.capture") as cap, patch(
        "stripe.Transfer.create"
    ) as tr:
        cap.return_value = fake_intent(amount=capture_amount, status="succeeded")
        tr.side_effect = stripe_mod.error.APIConnectionError("transfer network failure")
        yield cap, tr


@contextmanager
def stripe_capture_fails():
    """Capture itself fails — nothing moved."""
    import stripe as stripe_mod

    with patch("stripe.PaymentIntent.capture") as cap:
        cap.side_effect = stripe_mod.error.CardError(
            "card declined", param=None, code="card_declined"
        )
        yield cap
