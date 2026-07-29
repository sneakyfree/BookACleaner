"""Escrow release — the path that actually moves money.

`POST /payments/release/{job_id}` captures the client's held payment and
transfers the cleaner's share. It was the least-covered code in the repo (23%),
which is the wrong place to be thin: every defect here is measured in dollars.

These tests assert on the ARGUMENTS sent to Stripe and on the resulting job
row, not just on status codes — a release that returns 200 while transferring
the wrong amount, or double-paying on retry, is the failure that matters.
"""
import pytest

from tests.money_helpers import (
    job_row,
    make_admin,
    make_job,
    make_user,
    set_stripe_account,
    stripe_capture_fails,
    stripe_ok,
    stripe_transfer_fails,
)


# ── authorization ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_release_requires_authentication(client):
    resp = await client.post("/api/v1/payments/release/any-job")
    assert resp.status_code in (401, 403), resp.text


@pytest.mark.asyncio
async def test_release_rejects_non_owning_client(client):
    """A client must not release escrow on someone else's job.

    Without this gate any authenticated user could trigger a capture+payout on
    an arbitrary job id.
    """
    _, _, owner_profile = await make_user(client, "client")
    cleaner_h, _, cleaner_profile = await make_user(client, "cleaner")
    stranger_h, _, _ = await make_user(client, "client")

    job = await make_job(owner_profile, cleaner_profile)

    with stripe_ok() as (cap, tr):
        resp = await client.post(
            f"/api/v1/payments/release/{job['id']}", headers=stranger_h
        )

    assert resp.status_code == 403, resp.text
    # The gate must run BEFORE Stripe is touched.
    cap.assert_not_called()
    tr.assert_not_called()


@pytest.mark.asyncio
async def test_release_404_for_unknown_job(client):
    headers, _, _ = await make_user(client, "client")
    resp = await client.post("/api/v1/payments/release/no-such-job", headers=headers)
    assert resp.status_code == 404, resp.text


# ── state preconditions ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_release_rejects_incomplete_job(client):
    """Escrow cannot be released before the work is done."""
    headers, _, client_profile = await make_user(client, "client")
    _, _, cleaner_profile = await make_user(client, "cleaner")
    job = await make_job(client_profile, cleaner_profile, status="in_progress")

    with stripe_ok() as (cap, _):
        resp = await client.post(
            f"/api/v1/payments/release/{job['id']}", headers=headers
        )

    assert resp.status_code == 400
    assert "completed" in resp.json()["detail"].lower()
    cap.assert_not_called()


@pytest.mark.parametrize(
    "already", ["captured", "transferred", "released", "refunded"]
)
@pytest.mark.asyncio
async def test_release_is_idempotent_against_settled_jobs(client, already):
    """A settled job can never be released again — this is double-pay defence."""
    headers, _, client_profile = await make_user(client, "client")
    _, _, cleaner_profile = await make_user(client, "cleaner")
    job = await make_job(client_profile, cleaner_profile, payment_status=already)

    with stripe_ok() as (cap, tr):
        resp = await client.post(
            f"/api/v1/payments/release/{job['id']}", headers=headers
        )

    assert resp.status_code == 409, resp.text
    cap.assert_not_called()
    tr.assert_not_called()


@pytest.mark.asyncio
async def test_release_requires_a_payment_intent(client):
    headers, _, client_profile = await make_user(client, "client")
    _, _, cleaner_profile = await make_user(client, "cleaner")
    job = await make_job(client_profile, cleaner_profile, payment_intent_id=None)

    resp = await client.post(f"/api/v1/payments/release/{job['id']}", headers=headers)
    assert resp.status_code == 400
    assert "payment intent" in resp.json()["detail"].lower()


# ── the happy path, in dollars ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_release_splits_platform_fee_correctly(client):
    """15% platform fee: a $200 job pays the cleaner $170, not $200."""
    headers, _, client_profile = await make_user(client, "client")
    _, _, cleaner_profile = await make_user(client, "cleaner")
    await set_stripe_account(cleaner_profile, "acct_cleaner_1")
    job = await make_job(
        client_profile, cleaner_profile, total_price=200.0, payment_intent_id="pi_split"
    )

    with stripe_ok(capture_amount=20000, intent_id="pi_split") as (cap, tr):
        resp = await client.post(
            f"/api/v1/payments/release/{job['id']}", headers=headers
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["totalAmount"] == 20000
    assert body["platformFee"] == 3000       # 15% of $200
    assert body["cleanerPayout"] == 17000    # the remaining 85%

    # The cleaner is paid the NET amount, to their connected account.
    _, transfer_kwargs = tr.call_args
    assert transfer_kwargs["amount"] == 17000
    assert transfer_kwargs["destination"] == "acct_cleaner_1"
    assert transfer_kwargs["currency"] == "usd"

    row = await job_row(job["id"])
    assert row["payment_status"] == "transferred"
    assert row["paid_at"] is not None
    assert row["paid_out_at"] is not None


@pytest.mark.asyncio
async def test_release_sends_idempotency_keys_to_stripe(client):
    """Capture and transfer must carry idempotency keys.

    Without them a retried release charges and pays twice. The keys are derived
    from the job, so a retry replays the original result instead of moving more
    money.
    """
    headers, _, client_profile = await make_user(client, "client")
    _, _, cleaner_profile = await make_user(client, "cleaner")
    await set_stripe_account(cleaner_profile)
    job = await make_job(client_profile, cleaner_profile, payment_intent_id="pi_idem")

    with stripe_ok(intent_id="pi_idem") as (cap, tr):
        resp = await client.post(
            f"/api/v1/payments/release/{job['id']}", headers=headers
        )
    assert resp.status_code == 200, resp.text

    cap_key = cap.call_args.kwargs.get("idempotency_key")
    tr_key = tr.call_args.kwargs.get("idempotency_key")
    assert cap_key, "capture sent no idempotency_key"
    assert tr_key, "transfer sent no idempotency_key"
    # Job-scoped and distinct, so capture and transfer can't collide.
    assert job["id"] in cap_key and job["id"] in tr_key
    assert cap_key != tr_key


@pytest.mark.asyncio
async def test_release_without_connected_account_captures_but_does_not_transfer(client):
    """No Connect account: funds are captured and held, nothing is transferred."""
    headers, _, client_profile = await make_user(client, "client")
    _, _, cleaner_profile = await make_user(client, "cleaner")  # no stripe_account_id
    job = await make_job(client_profile, cleaner_profile)

    with stripe_ok() as (cap, tr):
        resp = await client.post(
            f"/api/v1/payments/release/{job['id']}", headers=headers
        )

    assert resp.status_code == 200, resp.text
    assert resp.json()["transfer"] is None
    tr.assert_not_called()

    row = await job_row(job["id"])
    assert row["payment_status"] == "captured"


@pytest.mark.asyncio
async def test_admin_may_release_any_job(client):
    """Admins bypass the ownership gate (support/ops path)."""
    _, _, client_profile = await make_user(client, "client")
    _, _, cleaner_profile = await make_user(client, "cleaner")
    await set_stripe_account(cleaner_profile)
    admin_h, _ = await make_admin(client)
    job = await make_job(client_profile, cleaner_profile)

    with stripe_ok():
        resp = await client.post(
            f"/api/v1/payments/release/{job['id']}", headers=admin_h
        )
    assert resp.status_code == 200, resp.text


# ── partial failure: the expensive case ───────────────────────────────────


@pytest.mark.asyncio
async def test_capture_success_then_transfer_failure_records_captured(client):
    """Capture succeeded, transfer failed — the money IS taken.

    The old code rewound the job to its pre-release status, so the record said
    "held" while Stripe had already captured. The retry then died on "already
    captured" and the cleaner was never paid, with nothing in the data to show
    it. The row must reflect reality: captured, payout outstanding.
    """
    headers, _, client_profile = await make_user(client, "client")
    _, _, cleaner_profile = await make_user(client, "cleaner")
    await set_stripe_account(cleaner_profile)
    job = await make_job(client_profile, cleaner_profile, payment_status="held")

    with stripe_transfer_fails():
        resp = await client.post(
            f"/api/v1/payments/release/{job['id']}", headers=headers
        )

    assert resp.status_code == 502, resp.text
    row = await job_row(job["id"])
    assert row["payment_status"] == "captured", (
        "job must record that funds were captured, not rewind to 'held'"
    )
    assert row["paid_at"] is not None


@pytest.mark.asyncio
async def test_capture_failure_restores_prior_status_for_retry(client):
    """Capture itself failed — nothing moved, so the job is releasable again."""
    headers, _, client_profile = await make_user(client, "client")
    _, _, cleaner_profile = await make_user(client, "cleaner")
    job = await make_job(client_profile, cleaner_profile, payment_status="held")

    with stripe_capture_fails():
        resp = await client.post(
            f"/api/v1/payments/release/{job['id']}", headers=headers
        )

    assert resp.status_code == 400, resp.text
    row = await job_row(job["id"])
    assert row["payment_status"] == "held", "a failed capture must be retryable"


@pytest.mark.asyncio
async def test_second_release_after_success_is_rejected(client):
    """End-to-end double-spend guard: release twice, pay once."""
    headers, _, client_profile = await make_user(client, "client")
    _, _, cleaner_profile = await make_user(client, "cleaner")
    await set_stripe_account(cleaner_profile)
    job = await make_job(client_profile, cleaner_profile)

    with stripe_ok() as (_, tr):
        first = await client.post(
            f"/api/v1/payments/release/{job['id']}", headers=headers
        )
        assert first.status_code == 200, first.text

        second = await client.post(
            f"/api/v1/payments/release/{job['id']}", headers=headers
        )

    assert second.status_code == 409, second.text
    assert tr.call_count == 1, "cleaner was paid twice"
