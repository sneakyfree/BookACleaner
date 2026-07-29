"""Subscriptions and Stripe Checkout.

Covers the recurring-revenue path: plan validation, checkout session creation,
what the customer is told they're on, and reconciliation when the webhook is
late or lost.
"""
import os
from types import SimpleNamespace
from unittest.mock import patch

import pytest
import stripe

from tests.money_helpers import StripeObj, make_user


PRICE_ENV = {
    "STRIPE_PAY_AS_YOU_GO_PRICE_ID": "price_payg",
    "STRIPE_WEEKLY_CLEAN_PRICE_ID": "price_weekly",
    "STRIPE_HOST_PRO_PRICE_ID": "price_hostpro",
}


def fake_session(session_id="cs_test_1", url="https://checkout.stripe.com/c/pay/cs_test_1"):
    return SimpleNamespace(id=session_id, url=url)


# ── plan validation ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_checkout_requires_auth(client):
    resp = await client.post(
        "/api/v1/payments/create-checkout-session", params={"plan": "host_pro"}
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_checkout_rejects_unknown_plan(client):
    headers, _, _ = await make_user(client, "cleaner")
    with patch("stripe.checkout.Session.create") as create:
        resp = await client.post(
            "/api/v1/payments/create-checkout-session",
            params={"plan": "free_forever"},
            headers=headers,
        )
    assert resp.status_code == 400, resp.text
    assert "invalid plan" in resp.json()["detail"].lower()
    create.assert_not_called()


@pytest.mark.asyncio
async def test_checkout_500s_when_price_id_unconfigured(client):
    """A missing price ID must fail loudly, not silently charge nothing."""
    headers, _, _ = await make_user(client, "cleaner")
    with patch.dict(os.environ, {"STRIPE_HOST_PRO_PRICE_ID": ""}, clear=False):
        with patch("stripe.checkout.Session.create") as create:
            resp = await client.post(
                "/api/v1/payments/create-checkout-session",
                params={"plan": "host_pro"},
                headers=headers,
            )
    assert resp.status_code == 500, resp.text
    create.assert_not_called()


# ── checkout session creation ─────────────────────────────────────────────


@pytest.mark.parametrize(
    "plan,expected_mode,expected_price",
    [
        ("pay_as_you_go", "payment", "price_payg"),
        ("weekly_clean", "subscription", "price_weekly"),
        ("host_pro", "subscription", "price_hostpro"),
    ],
)
@pytest.mark.asyncio
async def test_checkout_uses_correct_mode_and_price(
    client, plan, expected_mode, expected_price
):
    """One-time plans use `payment`; recurring plans use `subscription`.

    Getting this backwards either bills a subscription once or bills a one-off
    forever.
    """
    headers, user_id, _ = await make_user(client, "cleaner")

    with patch.dict(os.environ, PRICE_ENV, clear=False):
        with patch("stripe.checkout.Session.create", return_value=fake_session()) as create:
            resp = await client.post(
                "/api/v1/payments/create-checkout-session",
                params={"plan": plan},
                headers=headers,
            )

    assert resp.status_code == 200, resp.text
    kwargs = create.call_args.kwargs
    assert kwargs["mode"] == expected_mode
    assert kwargs["line_items"] == [{"price": expected_price, "quantity": 1}]
    # Metadata is how the webhook attributes the payment back to a user.
    assert kwargs["metadata"]["userId"] == user_id
    assert kwargs["metadata"]["plan"] == plan
    assert resp.json()["sessionId"] == "cs_test_1"
    assert resp.json()["url"].startswith("https://checkout.stripe.com/")


@pytest.mark.asyncio
async def test_checkout_surfaces_stripe_errors_as_400(client):
    headers, _, _ = await make_user(client, "cleaner")
    with patch.dict(os.environ, PRICE_ENV, clear=False):
        with patch(
            "stripe.checkout.Session.create",
            side_effect=stripe.error.InvalidRequestError("no such price", param="price"),
        ):
            resp = await client.post(
                "/api/v1/payments/create-checkout-session",
                params={"plan": "host_pro"},
                headers=headers,
            )
    assert resp.status_code == 400, resp.text


# ── what the customer is shown ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_subscription_defaults_to_free_plan(client):
    """A user with no subscription row is on Starter, not an error."""
    headers, _, _ = await make_user(client, "cleaner")
    resp = await client.get("/api/v1/payments/subscription", headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["plan_id"] == "free"
    assert body["status"] == "active"


@pytest.mark.asyncio
async def test_subscription_reports_active_plan_with_display_name(client):
    """An active row is surfaced with its human-facing name and price."""
    from app.database import db
    from app.models import generate_uuid
    from datetime import datetime, timezone

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
            "sid": "sub_display_1",
            "cid": "cus_1",
            "plan": "host_pro",
            "status": "active",
            "ps": now,
            "pe": now,
            "now": now,
        },
    )

    resp = await client.get("/api/v1/payments/subscription", headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["plan_id"] == "host_pro"
    assert body["plan_name"] == "Host Pro"
    assert body["plan_price"] == "$149/mo"
    assert body["stripe_subscription_id"] == "sub_display_1"


@pytest.mark.asyncio
async def test_canceled_subscription_falls_back_to_free(client):
    """A canceled row must not keep showing as a paid plan."""
    from app.database import db
    from app.models import generate_uuid
    from datetime import datetime, timezone

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
            "sid": "sub_cancelled_1",
            "cid": "cus_2",
            "plan": "host_pro",
            "status": "canceled",
            "ps": now,
            "pe": now,
            "now": now,
        },
    )

    resp = await client.get("/api/v1/payments/subscription", headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["plan_id"] == "free"


@pytest.mark.asyncio
async def test_subscription_requires_auth(client):
    resp = await client.get("/api/v1/payments/subscription")
    assert resp.status_code in (401, 403)


# ── reconciliation (webhook late or lost) ─────────────────────────────────


@pytest.mark.asyncio
async def test_reconcile_persists_paid_session(client):
    """The success redirect can settle the plan without waiting on the webhook.

    Webhooks can be delayed or dropped; a paying customer must not be left on
    the free plan because of it.
    """
    headers, user_id, _ = await make_user(client, "cleaner")

    session = StripeObj(
        id="cs_reconcile_1",
        payment_status="paid",
        status="complete",
        mode="subscription",
        subscription="sub_reconciled_1",
        customer="cus_reconciled_1",
        metadata={"userId": user_id, "plan": "weekly_clean"},
        amount_total=6900,
    )

    retrieved_sub = StripeObj(
        id="sub_reconciled_1",
        customer="cus_reconciled_1",
        current_period_start=1767225600,
        current_period_end=1767225600 + 604800,
    )

    with patch("stripe.checkout.Session.retrieve", return_value=session), patch(
        "stripe.Subscription.retrieve", return_value=retrieved_sub
    ):
        resp = await client.get(
            "/api/v1/payments/checkout-session/cs_reconcile_1", headers=headers
        )
    assert resp.status_code == 200, resp.text
    assert resp.json()["reconciled"] is True

    sub = await client.get("/api/v1/payments/subscription", headers=headers)
    assert sub.status_code == 200
    assert sub.json()["plan_id"] == "weekly_clean", (
        "a paid checkout session must settle the user's plan"
    )


@pytest.mark.asyncio
async def test_reconcile_ignores_unpaid_session(client):
    """An abandoned checkout must not grant a plan."""
    headers, user_id, _ = await make_user(client, "cleaner")

    session = StripeObj(
        id="cs_unpaid_1",
        payment_status="unpaid",
        status="open",
        mode="subscription",
        subscription=None,
        customer="cus_unpaid_1",
        metadata={"userId": user_id, "plan": "host_pro"},
        amount_total=14900,
    )

    with patch("stripe.checkout.Session.retrieve", return_value=session):
        resp = await client.get(
            "/api/v1/payments/checkout-session/cs_unpaid_1", headers=headers
        )
    assert resp.status_code in (200, 400, 402), resp.text

    sub = await client.get("/api/v1/payments/subscription", headers=headers)
    assert sub.json()["plan_id"] == "free", "unpaid checkout must not grant a plan"


@pytest.mark.asyncio
async def test_reconcile_rejects_another_users_session(client):
    """A session belonging to someone else must not settle onto my account."""
    _, victim_id, _ = await make_user(client, "cleaner")
    attacker_h, attacker_id, _ = await make_user(client, "cleaner")

    session = StripeObj(
        id="cs_victim_1",
        payment_status="paid",
        status="complete",
        mode="subscription",
        subscription="sub_victim_1",
        customer="cus_victim_1",
        metadata={"userId": victim_id, "plan": "host_pro"},
        amount_total=14900,
    )

    with patch("stripe.checkout.Session.retrieve", return_value=session), patch(
        "stripe.Subscription.retrieve"
    ) as sub_retrieve:
        resp = await client.get(
            "/api/v1/payments/checkout-session/cs_victim_1", headers=attacker_h
        )

    assert resp.status_code == 403, resp.text
    sub_retrieve.assert_not_called()

    mine = await client.get("/api/v1/payments/subscription", headers=attacker_h)
    assert mine.json()["plan_id"] == "free"


@pytest.mark.asyncio
async def test_reconcile_is_idempotent(client):
    """The success page can be refreshed; that must not create duplicate rows."""
    from app.database import db

    headers, user_id, _ = await make_user(client, "cleaner")
    session = StripeObj(
        id="cs_idem_1",
        payment_status="paid",
        status="complete",
        mode="subscription",
        subscription="sub_idem_1",
        customer="cus_idem_1",
        metadata={"userId": user_id, "plan": "weekly_clean"},
        amount_total=6900,
    )
    retrieved_sub = StripeObj(
        id="sub_idem_1",
        customer="cus_idem_1",
        current_period_start=1767225600,
        current_period_end=1767225600 + 604800,
    )

    with patch("stripe.checkout.Session.retrieve", return_value=session), patch(
        "stripe.Subscription.retrieve", return_value=retrieved_sub
    ):
        for _ in range(3):
            resp = await client.get(
                "/api/v1/payments/checkout-session/cs_idem_1", headers=headers
            )
            assert resp.status_code == 200, resp.text

    rows = await db.execute(
        "SELECT id FROM subscriptions WHERE stripe_subscription_id = :sid",
        {"sid": "sub_idem_1"},
    )
    assert len(rows) == 1, f"expected exactly one subscription row, got {len(rows)}"


@pytest.mark.asyncio
async def test_reconcile_requires_auth(client):
    resp = await client.get("/api/v1/payments/checkout-session/cs_x")
    assert resp.status_code in (401, 403)
