"""Stripe Connect onboarding — how a cleaner becomes able to receive money.

Until a cleaner has a Connect account with payouts enabled, a release captures
the client's funds but cannot pay them out. These are the endpoints that get
them there.
"""
from unittest.mock import patch

import pytest
import stripe

from tests.money_helpers import StripeObj, make_user, set_stripe_account


# ── account creation ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_connected_account_requires_auth(client):
    resp = await client.post(
        "/api/v1/payments/create-connected-account",
        json={"email": "x@test.com"},
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_create_connected_account_returns_account_id(client):
    headers, _, _ = await make_user(client, "cleaner")
    account = StripeObj(id="acct_new_1")

    with patch("stripe.Account.create", return_value=account) as create:
        resp = await client.post(
            "/api/v1/payments/create-connected-account",
            json={"email": "cleaner@test.com", "businessName": "Sparkle Co"},
            headers=headers,
        )

    assert resp.status_code == 200, resp.text
    assert resp.json()["accountId"] == "acct_new_1"
    create.assert_called_once()


@pytest.mark.asyncio
async def test_create_connected_account_surfaces_stripe_errors(client):
    headers, _, _ = await make_user(client, "cleaner")
    with patch(
        "stripe.Account.create",
        side_effect=stripe.error.InvalidRequestError("bad country", param="country"),
    ):
        resp = await client.post(
            "/api/v1/payments/create-connected-account",
            json={"email": "cleaner@test.com"},
            headers=headers,
        )
    assert resp.status_code == 400, resp.text


# ── onboarding link ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_account_link_requires_auth(client):
    resp = await client.post(
        "/api/v1/payments/create-account-link",
        json={
            "accountId": "acct_1",
            "returnUrl": "https://x/return",
            "refreshUrl": "https://x/refresh",
        },
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_account_link_returns_onboarding_url(client):
    headers, _, _ = await make_user(client, "cleaner")
    link = StripeObj(url="https://connect.stripe.com/setup/s/abc123")

    with patch("stripe.AccountLink.create", return_value=link) as create:
        resp = await client.post(
            "/api/v1/payments/create-account-link",
            json={
                "accountId": "acct_link_1",
                "returnUrl": "https://app/return",
                "refreshUrl": "https://app/refresh",
            },
            headers=headers,
        )

    assert resp.status_code == 200, resp.text
    assert resp.json()["url"].startswith("https://connect.stripe.com/")
    kwargs = create.call_args.kwargs
    assert kwargs["account"] == "acct_link_1"
    assert kwargs["return_url"] == "https://app/return"
    assert kwargs["refresh_url"] == "https://app/refresh"


# ── account status ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_account_status_requires_auth(client):
    resp = await client.get("/api/v1/payments/account-status/acct_1")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_account_status_reports_payout_readiness(client):
    """`payouts_enabled` is what decides whether a release can pay out."""
    headers, _, _ = await make_user(client, "cleaner")
    account = StripeObj(
        id="acct_ready_1",
        charges_enabled=True,
        payouts_enabled=True,
        details_submitted=True,
        requirements=StripeObj(currently_due=[], eventually_due=[]),
    )

    with patch("stripe.Account.retrieve", return_value=account):
        resp = await client.get(
            "/api/v1/payments/account-status/acct_ready_1", headers=headers
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["chargesEnabled"] is True
    assert body["payoutsEnabled"] is True


@pytest.mark.asyncio
async def test_account_status_reports_incomplete_onboarding(client):
    """A half-onboarded account must report as not payout-ready."""
    headers, _, _ = await make_user(client, "cleaner")
    account = StripeObj(
        id="acct_pending_1",
        charges_enabled=False,
        payouts_enabled=False,
        details_submitted=False,
        requirements=StripeObj(
            currently_due=["individual.id_number"], eventually_due=[]
        ),
    )

    with patch("stripe.Account.retrieve", return_value=account):
        resp = await client.get(
            "/api/v1/payments/account-status/acct_pending_1", headers=headers
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["payoutsEnabled"] is False
    assert body["chargesEnabled"] is False


# ── webhook: account.updated ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_account_updated_webhook_notifies_when_activated(client):
    """When Connect finishes, the cleaner is told they can be paid."""
    from types import SimpleNamespace

    from app.api.v1 import payments as payments_module
    from app.database import db

    payments_module._processed_webhook_events.clear()
    payments_module._processed_webhook_order.clear()

    _, cleaner_user_id, cleaner_profile = await make_user(client, "cleaner")
    await set_stripe_account(cleaner_profile, "acct_activated_1")

    account = StripeObj(
        id="acct_activated_1", charges_enabled=True, payouts_enabled=True
    )
    event = SimpleNamespace(
        id="evt_acct_1",
        type="account.updated",
        data=SimpleNamespace(object=account),
    )

    with patch("stripe.Webhook.construct_event", return_value=event):
        resp = await client.post(
            "/api/v1/payments/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=ok"},
        )

    assert resp.status_code == 200, resp.text
    notes = await db.notification.find_many(where={"user_id": cleaner_user_id})
    assert any(n.get("type") == "stripe_active" for n in notes), (
        "cleaner was not notified that their Stripe account went live"
    )


# ── payment methods ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_payment_methods_requires_auth(client):
    resp = await client.get("/api/v1/payments/payment-methods")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_payment_methods_returns_array(client):
    """The settings UI indexes this directly — it must be a list, not an object."""
    headers, _, _ = await make_user(client, "client")
    resp = await client.get("/api/v1/payments/payment-methods", headers=headers)
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)
