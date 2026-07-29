"""Payment intent creation, admin capture/refund, and cleaner payouts.

Focus is on the controls that stop money going the wrong way: server-side
pricing (a client cannot choose what they pay), the admin gate on
capture/refund/transfer, and the payout balance ceiling.
"""
from unittest.mock import MagicMock, patch

import pytest

from tests.money_helpers import (
    fake_intent,
    job_row,
    make_admin,
    make_job,
    make_user,
)


# ── create-payment-intent ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_intent_requires_auth(client):
    resp = await client.post(
        "/api/v1/payments/create-payment-intent",
        json={"amount": 1000, "jobId": "x"},
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_create_intent_ignores_client_supplied_amount(client):
    """The charge is derived from the job, never from the request body.

    This is the control that stops a client paying $1 for a $200 job. The
    request `amount` is deliberately ignored.
    """
    headers, _, client_profile = await make_user(client, "client")
    job = await make_job(client_profile, None, total_price=200.0, status="pending")

    with patch("stripe.PaymentIntent.create") as create:
        create.return_value = fake_intent(intent_id="pi_server_priced", amount=20000)
        resp = await client.post(
            "/api/v1/payments/create-payment-intent",
            json={"amount": 100, "jobId": job["id"]},  # attacker says $1.00
            headers=headers,
        )

    assert resp.status_code == 200, resp.text
    assert create.call_args.kwargs["amount"] == 20000, (
        "Stripe must be charged the job's price, not the client-supplied amount"
    )


@pytest.mark.asyncio
async def test_create_intent_defaults_to_manual_capture_escrow(client):
    """Funds are authorized and held, not captured immediately."""
    headers, _, client_profile = await make_user(client, "client")
    job = await make_job(client_profile, None, total_price=120.0, status="pending")

    with patch("stripe.PaymentIntent.create") as create:
        create.return_value = fake_intent(intent_id="pi_escrow", amount=12000)
        resp = await client.post(
            "/api/v1/payments/create-payment-intent",
            json={"amount": 12000, "jobId": job["id"]},
            headers=headers,
        )

    assert resp.status_code == 200, resp.text
    assert create.call_args.kwargs["capture_method"] == "manual"

    row = await job_row(job["id"])
    assert row["payment_status"] == "authorized"
    assert row["stripe_payment_intent_id"] == "pi_escrow"


@pytest.mark.asyncio
async def test_create_intent_rejects_other_peoples_jobs(client):
    headers, _, owner_profile = await make_user(client, "client")
    stranger_h, _, _ = await make_user(client, "client")
    job = await make_job(owner_profile, None, status="pending")

    with patch("stripe.PaymentIntent.create") as create:
        resp = await client.post(
            "/api/v1/payments/create-payment-intent",
            json={"amount": 1000, "jobId": job["id"]},
            headers=stranger_h,
        )

    assert resp.status_code == 403, resp.text
    create.assert_not_called()


@pytest.mark.asyncio
async def test_create_intent_rejects_job_without_price(client):
    headers, _, client_profile = await make_user(client, "client")
    job = await make_job(client_profile, None, total_price=0, status="pending")

    resp = await client.post(
        "/api/v1/payments/create-payment-intent",
        json={"amount": 5000, "jobId": job["id"]},
        headers=headers,
    )
    assert resp.status_code == 400
    assert "payable" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_intent_404_for_unknown_job(client):
    headers, _, _ = await make_user(client, "client")
    resp = await client.post(
        "/api/v1/payments/create-payment-intent",
        json={"amount": 5000, "jobId": "nope"},
        headers=headers,
    )
    assert resp.status_code == 404


@pytest.mark.parametrize("bad_amount", [0, -100, 5_000_001])
@pytest.mark.asyncio
async def test_create_intent_validates_amount_bounds(client, bad_amount):
    """Schema bounds still reject absurd values before any lookup."""
    headers, _, _ = await make_user(client, "client")
    resp = await client.post(
        "/api/v1/payments/create-payment-intent",
        json={"amount": bad_amount, "jobId": "some-job"},
        headers=headers,
    )
    assert resp.status_code == 422, resp.text


# ── admin-only money operations ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_capture_requires_admin(client):
    headers, _, _ = await make_user(client, "client")
    with patch("stripe.PaymentIntent.capture") as cap:
        resp = await client.post(
            "/api/v1/payments/capture-payment/pi_x", headers=headers
        )
    assert resp.status_code == 403, resp.text
    cap.assert_not_called()


@pytest.mark.asyncio
async def test_refund_requires_admin(client):
    headers, _, _ = await make_user(client, "cleaner")
    with patch("stripe.Refund.create") as refund:
        resp = await client.post("/api/v1/payments/refund/pi_x", headers=headers)
    assert resp.status_code == 403, resp.text
    refund.assert_not_called()


@pytest.mark.asyncio
async def test_transfer_requires_admin(client):
    headers, _, _ = await make_user(client, "cleaner")
    with patch("stripe.Transfer.create") as tr:
        resp = await client.post(
            "/api/v1/payments/transfer",
            params={
                "amount": 5000,
                "destination_account_id": "acct_x",
                "job_id": "j1",
            },
            headers=headers,
        )
    assert resp.status_code == 403, resp.text
    tr.assert_not_called()


@pytest.mark.asyncio
async def test_admin_capture_marks_job_captured(client):
    _, _, client_profile = await make_user(client, "client")
    admin_h, _ = await make_admin(client)
    job = await make_job(client_profile, None, payment_status="authorized")

    with patch("stripe.PaymentIntent.capture") as cap:
        cap.return_value = fake_intent(
            intent_id="pi_admin_cap", status="succeeded", job_id=job["id"]
        )
        resp = await client.post(
            "/api/v1/payments/capture-payment/pi_admin_cap", headers=admin_h
        )

    assert resp.status_code == 200, resp.text
    row = await job_row(job["id"])
    assert row["payment_status"] == "captured"
    assert row["paid_at"] is not None


@pytest.mark.asyncio
async def test_admin_refund_marks_job_refunded(client):
    _, _, client_profile = await make_user(client, "client")
    admin_h, _ = await make_admin(client)
    job = await make_job(client_profile, None, payment_status="captured")

    refund_obj = MagicMock()
    refund_obj.id = "re_1"
    refund_obj.status = "succeeded"

    with patch("stripe.Refund.create", return_value=refund_obj), patch(
        "stripe.PaymentIntent.retrieve"
    ) as retrieve:
        retrieve.return_value = fake_intent(job_id=job["id"])
        resp = await client.post(
            "/api/v1/payments/refund/pi_refund", headers=admin_h
        )

    assert resp.status_code == 200, resp.text
    assert resp.json()["refundId"] == "re_1"
    row = await job_row(job["id"])
    assert row["payment_status"] == "refunded"


# ── payouts ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_payouts_report_net_of_platform_fee(client):
    """A cleaner sees what they actually receive, not the gross job price."""
    _, _, client_profile = await make_user(client, "client")
    cleaner_h, _, cleaner_profile = await make_user(client, "cleaner")
    await make_job(client_profile, cleaner_profile, total_price=200.0, status="completed")

    resp = await client.get("/api/v1/payments/payouts/", headers=cleaner_h)
    assert resp.status_code == 200, resp.text
    payouts = resp.json()
    assert len(payouts) == 1
    assert payouts[0]["grossAmount"] == 200.0
    assert payouts[0]["amount"] == 170.0        # net of 15%
    assert payouts[0]["platformFee"] == 30.0


@pytest.mark.asyncio
async def test_payouts_exclude_incomplete_jobs(client):
    _, _, client_profile = await make_user(client, "client")
    cleaner_h, _, cleaner_profile = await make_user(client, "cleaner")
    await make_job(client_profile, cleaner_profile, status="in_progress")
    await make_job(client_profile, cleaner_profile, status="pending")

    resp = await client.get("/api/v1/payments/payouts/", headers=cleaner_h)
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_payout_request_cannot_exceed_available_balance(client):
    """The ceiling is the post-fee balance of completed, unpaid jobs."""
    _, _, client_profile = await make_user(client, "client")
    cleaner_h, _, cleaner_profile = await make_user(client, "cleaner")
    await make_job(client_profile, cleaner_profile, total_price=100.0, status="completed")
    # available = 100 * 0.85 = 85.00

    over = await client.post(
        "/api/v1/payments/request-payout", json={"amount": 85.01}, headers=cleaner_h
    )
    assert over.status_code == 400, over.text
    assert "exceeds available balance" in over.json()["detail"]

    exact = await client.post(
        "/api/v1/payments/request-payout", json={"amount": 85.00}, headers=cleaner_h
    )
    assert exact.status_code == 200, exact.text
    assert exact.json()["available_balance"] == 85.0


@pytest.mark.asyncio
async def test_already_paid_out_jobs_do_not_add_to_balance(client):
    """A job already paid out must not be withdrawable a second time."""
    from datetime import datetime, timezone

    _, _, client_profile = await make_user(client, "client")
    cleaner_h, _, cleaner_profile = await make_user(client, "cleaner")
    await make_job(
        client_profile,
        cleaner_profile,
        total_price=100.0,
        status="completed",
        paid_out_at=datetime.now(timezone.utc),
    )

    resp = await client.post(
        "/api/v1/payments/request-payout", json={"amount": 1.00}, headers=cleaner_h
    )
    assert resp.status_code == 400, resp.text
    assert "exceeds available balance ($0.00)" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_clients_cannot_request_payouts(client):
    headers, _, _ = await make_user(client, "client")
    resp = await client.post(
        "/api/v1/payments/request-payout", json={"amount": 10.0}, headers=headers
    )
    assert resp.status_code == 403
    assert "cleaners" in resp.json()["detail"].lower()


@pytest.mark.parametrize("bad", [0, -5.0, float("nan"), float("inf")])
@pytest.mark.asyncio
async def test_payout_rejects_non_finite_and_non_positive_amounts(client, bad):
    """NaN/Infinity previously passed the <= 0 check and 500'd on serialization."""
    cleaner_h, _, _ = await make_user(client, "cleaner")
    resp = await client.post(
        "/api/v1/payments/request-payout", json={"amount": bad}, headers=cleaner_h
    )
    assert resp.status_code in (400, 422), resp.text
