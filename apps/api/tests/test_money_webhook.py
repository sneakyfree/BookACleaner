"""Stripe webhook: signature verification, idempotency, and event handling.

The webhook is unauthenticated by design — its only defence is the signature,
and its only protection against double-processing is idempotency. Both are
tested here against the real endpoint.
"""
from types import SimpleNamespace
from unittest.mock import patch

import pytest
import stripe

from app.api.v1 import payments as payments_module
from tests.money_helpers import job_row, make_job, make_user


def make_event(event_type: str, obj, event_id: str = "evt_test_1"):
    """A Stripe-event-shaped object: attribute access, `.type`, `.data.object`."""
    return SimpleNamespace(
        id=event_id, type=event_type, data=SimpleNamespace(object=obj)
    )


@pytest.fixture(autouse=True)
def _clear_local_idempotency():
    """Reset the in-process dedup store between tests."""
    payments_module._processed_webhook_events.clear()
    payments_module._processed_webhook_order.clear()
    yield
    payments_module._processed_webhook_events.clear()
    payments_module._processed_webhook_order.clear()


# ── signature verification ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_webhook_rejects_missing_signature(client):
    resp = await client.post("/api/v1/payments/webhook", content=b"{}")
    assert resp.status_code == 400, resp.text


@pytest.mark.asyncio
async def test_webhook_rejects_bad_signature(client):
    """A forged payload must never reach the handlers."""
    with patch(
        "stripe.Webhook.construct_event",
        side_effect=stripe.error.SignatureVerificationError("bad sig", "sig_header"),
    ):
        resp = await client.post(
            "/api/v1/payments/webhook",
            content=b'{"id":"evt_forged"}',
            headers={"stripe-signature": "t=1,v1=forged"},
        )
    assert resp.status_code == 400
    assert "signature" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_webhook_rejects_malformed_payload(client):
    with patch("stripe.Webhook.construct_event", side_effect=ValueError("bad json")):
        resp = await client.post(
            "/api/v1/payments/webhook",
            content=b"not-json",
            headers={"stripe-signature": "t=1,v1=x"},
        )
    assert resp.status_code == 400
    assert "payload" in resp.json()["detail"].lower()


# ── idempotency ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_duplicate_event_is_processed_once(client):
    """Stripe retries deliveries; the same event must not apply twice."""
    _, _, client_profile = await make_user(client, "client")
    job = await make_job(client_profile, None, payment_status="authorized")

    intent = SimpleNamespace(
        id="pi_dupe", amount=15000, metadata={"jobId": job["id"]}
    )
    event = make_event("payment_intent.succeeded", intent, event_id="evt_dupe_1")

    with patch("stripe.Webhook.construct_event", return_value=event):
        first = await client.post(
            "/api/v1/payments/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=ok"},
        )
        second = await client.post(
            "/api/v1/payments/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=ok"},
        )

    assert first.status_code == 200, first.text
    assert first.json().get("duplicate") is not True
    assert second.status_code == 200, second.text
    assert second.json()["duplicate"] is True, "replay was not deduplicated"


@pytest.mark.asyncio
async def test_local_dedup_evicts_oldest_not_everything(client):
    """The in-process fallback is a bounded FIFO, not a set that wipes itself.

    The old implementation called clear() at the cap, so every duplicate
    arriving just after a wipe was reprocessed — for payment events that means
    double-crediting. Oldest-first eviction keeps the newest N protected.
    """
    remember = payments_module._remember_event_locally
    cap = payments_module._MAX_TRACKED_EVENTS

    assert remember("evt_first") is True
    for i in range(cap):
        remember(f"evt_filler_{i}")

    # Store is at capacity and the oldest id has aged out...
    assert len(payments_module._processed_webhook_events) <= cap
    # ...but recent ids are still protected (a clear() would have dropped these).
    assert remember(f"evt_filler_{cap - 1}") is False
    assert remember("evt_brand_new") is True


# ── event handling ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_payment_succeeded_moves_job_to_held(client):
    _, _, client_profile = await make_user(client, "client")
    job = await make_job(client_profile, None, payment_status="authorized")

    intent = SimpleNamespace(id="pi_ok", amount=20000, metadata={"jobId": job["id"]})
    event = make_event("payment_intent.succeeded", intent, event_id="evt_ok_1")

    with patch("stripe.Webhook.construct_event", return_value=event):
        resp = await client.post(
            "/api/v1/payments/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=ok"},
        )

    assert resp.status_code == 200, resp.text
    row = await job_row(job["id"])
    assert row["payment_status"] == "held"


@pytest.mark.asyncio
async def test_payment_failed_marks_job_failed(client):
    _, _, client_profile = await make_user(client, "client")
    job = await make_job(client_profile, None, payment_status="authorized")

    intent = SimpleNamespace(id="pi_bad", amount=20000, metadata={"jobId": job["id"]})
    event = make_event("payment_intent.payment_failed", intent, event_id="evt_fail_1")

    with patch("stripe.Webhook.construct_event", return_value=event):
        resp = await client.post(
            "/api/v1/payments/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=ok"},
        )

    assert resp.status_code == 200, resp.text
    row = await job_row(job["id"])
    assert row["payment_status"] == "failed"


@pytest.mark.asyncio
async def test_dispute_marks_job_disputed_and_alerts_admins(client):
    """A chargeback must flag the job and reach an admin.

    A dispute nobody sees is a dispute nobody contests, and Stripe's response
    window is short.
    """
    from app.database import db
    from tests.money_helpers import make_admin

    _, _, client_profile = await make_user(client, "client")
    _, admin_user_id = await make_admin(client)

    job = await make_job(client_profile, None, payment_status="captured")

    dispute = SimpleNamespace(
        id="dp_test_1", payment_intent="pi_disputed", amount=20000, reason="fraudulent"
    )
    event = make_event("charge.dispute.created", dispute, event_id="evt_disp_1")
    retrieved = SimpleNamespace(id="pi_disputed", metadata={"jobId": job["id"]})

    with patch("stripe.Webhook.construct_event", return_value=event), patch(
        "stripe.PaymentIntent.retrieve", return_value=retrieved
    ):
        resp = await client.post(
            "/api/v1/payments/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=ok"},
        )

    assert resp.status_code == 200, resp.text
    row = await job_row(job["id"])
    assert row["payment_status"] == "disputed"

    notes = await db.notification.find_many(where={"user_id": admin_user_id})
    assert any(n.get("type") == "dispute" for n in notes), "no admin was alerted"


@pytest.mark.asyncio
async def test_subscription_periods_are_stored_as_utc(client):
    """Stripe sends epoch-UTC; storing it through server-local time shifts billing.

    1767225600 == 2026-01-01T00:00:00Z. Whatever the server's timezone, the
    stored value must be that instant.
    """
    headers, user_id, _ = await make_user(client, "client")

    start_epoch = 1767225600           # 2026-01-01T00:00:00Z
    end_epoch = start_epoch + 2592000  # +30d

    sub = SimpleNamespace(
        id="sub_utc_1",
        customer="cus_1",
        metadata={"userId": user_id, "plan": "host_pro"},
        current_period_start=start_epoch,
        current_period_end=end_epoch,
    )
    event = make_event("customer.subscription.created", sub, event_id="evt_sub_1")

    with patch("stripe.Webhook.construct_event", return_value=event):
        resp = await client.post(
            "/api/v1/payments/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=ok"},
        )
    assert resp.status_code == 200, resp.text

    from datetime import datetime, timezone

    from app.database import db

    rows = await db.execute(
        "SELECT current_period_start FROM subscriptions WHERE stripe_subscription_id = :sid",
        {"sid": "sub_utc_1"},
    )
    assert rows, "subscription row was not written"
    row = rows[0]
    stored = row["current_period_start"] if isinstance(row, dict) else row[0]
    # SQLite has no native datetime type and hands back an ISO string;
    # PostgreSQL returns a real (tz-aware) datetime. Normalise both so this
    # test asserts the same instant on either engine.
    if isinstance(stored, str):
        stored = datetime.fromisoformat(stored)
    if stored.tzinfo is None:
        stored = stored.replace(tzinfo=timezone.utc)
    assert stored == datetime.fromtimestamp(start_epoch, tz=timezone.utc)


@pytest.mark.asyncio
async def test_refund_completed_marks_job_refunded(client):
    """Stripe confirms the refund settled — the job must reflect it."""
    _, _, client_profile = await make_user(client, "client")
    job = await make_job(client_profile, None, payment_status="captured")

    refund = SimpleNamespace(
        id="re_settled_1", status="succeeded", payment_intent="pi_refunded_1"
    )
    event = make_event("charge.refund.updated", refund, event_id="evt_refund_1")
    retrieved = SimpleNamespace(id="pi_refunded_1", metadata={"jobId": job["id"]})

    with patch("stripe.Webhook.construct_event", return_value=event), patch(
        "stripe.PaymentIntent.retrieve", return_value=retrieved
    ):
        resp = await client.post(
            "/api/v1/payments/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=ok"},
        )

    assert resp.status_code == 200, resp.text
    row = await job_row(job["id"])
    assert row["payment_status"] == "refunded"


@pytest.mark.asyncio
async def test_pending_refund_does_not_mark_job_refunded(client):
    """Only a SUCCEEDED refund settles the job; a pending one must not."""
    _, _, client_profile = await make_user(client, "client")
    job = await make_job(client_profile, None, payment_status="captured")

    refund = SimpleNamespace(
        id="re_pending_1", status="pending", payment_intent="pi_pending_1"
    )
    event = make_event("charge.refund.updated", refund, event_id="evt_refund_pending")

    with patch("stripe.Webhook.construct_event", return_value=event), patch(
        "stripe.PaymentIntent.retrieve"
    ) as retrieve:
        resp = await client.post(
            "/api/v1/payments/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=ok"},
        )

    assert resp.status_code == 200, resp.text
    retrieve.assert_not_called()
    row = await job_row(job["id"])
    assert row["payment_status"] == "captured", "a pending refund settled the job early"


@pytest.mark.asyncio
async def test_subscription_deleted_marks_row_canceled(client):
    """Cancelling at Stripe must revoke the plan locally."""
    from datetime import datetime, timezone

    from app.database import db
    from app.models import generate_uuid

    headers, user_id, _ = await make_user(client, "cleaner")
    now = datetime.now(timezone.utc)
    await db.execute(
        """INSERT INTO subscriptions (id, user_id, stripe_subscription_id,
               stripe_customer_id, plan, status, current_period_start,
               current_period_end, created_at, updated_at)
           VALUES (:id, :uid, :sid, :cid, :plan, :status, :ps, :pe, :now, :now)""",
        {
            "id": generate_uuid(),
            "uid": user_id,
            "sid": "sub_to_cancel_1",
            "cid": "cus_cancel_1",
            "plan": "host_pro",
            "status": "active",
            "ps": now,
            "pe": now,
            "now": now,
        },
    )
    active = await client.get("/api/v1/payments/subscription", headers=headers)
    assert active.json()["plan_id"] == "host_pro"

    sub = SimpleNamespace(id="sub_to_cancel_1")
    event = make_event("customer.subscription.deleted", sub, event_id="evt_subdel_1")

    with patch("stripe.Webhook.construct_event", return_value=event):
        resp = await client.post(
            "/api/v1/payments/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=ok"},
        )
    assert resp.status_code == 200, resp.text

    after = await client.get("/api/v1/payments/subscription", headers=headers)
    assert after.json()["plan_id"] == "free", "canceled subscription still grants a plan"


@pytest.mark.asyncio
async def test_checkout_completed_records_one_time_purchase(client):
    """`mode=payment` plans are one-off purchases, not subscriptions."""
    from tests.money_helpers import StripeObj

    headers, user_id, _ = await make_user(client, "cleaner")

    session = StripeObj(
        id="cs_onetime_1",
        payment_status="paid",
        status="complete",
        mode="payment",
        payment_intent="pi_onetime_1",
        subscription=None,
        customer="cus_onetime_1",
        metadata={"userId": user_id, "plan": "pay_as_you_go"},
        amount_total=8900,
    )
    event = make_event("checkout.session.completed", session, event_id="evt_onetime_1")

    with patch("stripe.Webhook.construct_event", return_value=event):
        resp = await client.post(
            "/api/v1/payments/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=ok"},
        )
    assert resp.status_code == 200, resp.text

    sub = await client.get("/api/v1/payments/subscription", headers=headers)
    assert sub.json()["plan_id"] == "pay_as_you_go"
    assert sub.json()["status"] == "one_time"


@pytest.mark.asyncio
async def test_unknown_event_type_is_acknowledged(client):
    """Unhandled types must 200 — a non-2xx makes Stripe retry forever."""
    event = make_event(
        "invoice.payment_action_required", SimpleNamespace(id="in_1"), event_id="evt_unk_1"
    )
    with patch("stripe.Webhook.construct_event", return_value=event):
        resp = await client.post(
            "/api/v1/payments/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=ok"},
        )
    assert resp.status_code == 200, resp.text
    assert resp.json()["received"] is True


@pytest.mark.asyncio
async def test_event_for_unknown_job_does_not_error(client):
    """A job id we don't recognise must not 500 the webhook."""
    intent = SimpleNamespace(id="pi_orphan", amount=1000, metadata={"jobId": "ghost-job"})
    event = make_event("payment_intent.succeeded", intent, event_id="evt_orphan_1")

    with patch("stripe.Webhook.construct_event", return_value=event):
        resp = await client.post(
            "/api/v1/payments/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=ok"},
        )
    assert resp.status_code == 200, resp.text
