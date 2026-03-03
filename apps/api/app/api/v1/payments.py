from fastapi import APIRouter, Request, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import Optional
import stripe
import os
import logging

from app.config import get_settings
from app.database import get_db
from app.api.deps import get_current_user, get_admin_user
from app.core.feature_flags import flags

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)

# In-memory webhook idempotency set (use Redis in multi-instance deployments)
_processed_webhook_events: set = set()

# Configure Stripe
stripe.api_key = settings.stripe_secret_key

PLATFORM_FEE_PERCENT = 15  # 15% platform fee


class CreatePaymentIntentRequest(BaseModel):
    amount: int = Field(gt=0, le=5000000, description="Amount in cents")  # max $50,000
    jobId: str = Field(min_length=1)
    customerId: Optional[str] = None
    capture_method: str = "manual"  # manual = escrow hold


class CreateConnectedAccountRequest(BaseModel):
    email: str
    businessName: Optional[str] = None


class OnboardingLinkRequest(BaseModel):
    accountId: str
    returnUrl: str
    refreshUrl: str


# Auth imported from app.api.deps (canonical source)


@router.post("/create-payment-intent")
async def create_payment_intent(data: CreatePaymentIntentRequest, user=Depends(get_current_user), db=Depends(get_db)):
    """Create a payment intent for a job booking (escrow hold by default)."""
    if not flags.stripe_payments_enabled:
        raise HTTPException(status_code=503, detail="Payment processing is temporarily disabled")

    try:
        intent = stripe.PaymentIntent.create(
            amount=data.amount,
            currency="usd",
            customer=data.customerId,
            metadata={"jobId": data.jobId},
            capture_method=data.capture_method,
            automatic_payment_methods={"enabled": True},
        )

        # Update job with payment intent ID
        job = await db.job.find_unique(where={"id": data.jobId})
        if job:
            await db.job.update(
                where={"id": data.jobId},
                data={
                    "stripe_payment_intent_id": intent.id,
                    "payment_status": "authorized",
                }
            )

        logger.info(f"Created payment intent {intent.id} for job {data.jobId}")
        return {
            "clientSecret": intent.client_secret,
            "paymentIntentId": intent.id,
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating payment intent: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/capture-payment/{payment_intent_id}")
async def capture_payment(payment_intent_id: str, user=Depends(get_admin_user), db=Depends(get_db)):
    """Capture a held payment (after job is completed)."""
    try:
        intent = stripe.PaymentIntent.capture(payment_intent_id)

        # Update job payment status
        job_id = intent.metadata.get("jobId")
        if job_id:
            await db.job.update(
                where={"id": job_id},
                data={"payment_status": "captured", "paid_at": __import__('datetime').datetime.utcnow()}
            )
            logger.info(f"Captured payment for job {job_id}")

        return {"status": intent.status, "jobId": job_id}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error capturing payment: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/refund/{payment_intent_id}")
async def refund_payment(payment_intent_id: str, amount: Optional[int] = None, user=Depends(get_admin_user), db=Depends(get_db)):
    """Refund a payment (full or partial)."""
    try:
        refund = stripe.Refund.create(
            payment_intent=payment_intent_id,
            amount=amount,
        )

        # Update job if found
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        job_id = intent.metadata.get("jobId")
        if job_id:
            await db.job.update(
                where={"id": job_id},
                data={"payment_status": "refunded"}
            )
            logger.info(f"Refunded payment for job {job_id}")

        return {"refundId": refund.id, "status": refund.status}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/release/{job_id}")
async def release_payment(job_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    """Release escrow: capture payment + transfer to cleaner (minus platform fee)."""
    job = await db.job.find_unique(where={"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Job must be completed before releasing payment")

    payment_intent_id = job.get("stripe_payment_intent_id")
    if not payment_intent_id:
        raise HTTPException(status_code=400, detail="No payment intent found for this job")

    try:
        # Step 1: Capture the held payment
        intent = stripe.PaymentIntent.capture(payment_intent_id)
        amount = intent.amount

        # Step 2: Calculate platform fee and cleaner payout
        platform_fee = int(amount * PLATFORM_FEE_PERCENT / 100)
        cleaner_amount = amount - platform_fee

        # Step 3: Transfer to cleaner's connected account
        cleaner = await db.cleaner.find_unique(where={"id": job.get("cleaner_id")})
        transfer_result = None
        if cleaner and cleaner.get("stripe_account_id"):
            transfer = stripe.Transfer.create(
                amount=cleaner_amount,
                currency="usd",
                destination=cleaner["stripe_account_id"],
                metadata={"jobId": job_id},
            )
            transfer_result = {"transferId": transfer.id, "amount": cleaner_amount}

            # Update job status
            from datetime import datetime
            await db.job.update(
                where={"id": job_id},
                data={
                    "payment_status": "transferred",
                    "paid_at": datetime.utcnow(),
                    "paid_out_at": datetime.utcnow(),
                }
            )
            logger.info(f"Released payment for job {job_id}: ${cleaner_amount/100:.2f} to cleaner")
        else:
            await db.job.update(
                where={"id": job_id},
                data={"payment_status": "captured"}
            )
            logger.warning(f"Captured payment for job {job_id} but no cleaner Stripe account to transfer to")

        return {
            "captured": True,
            "totalAmount": amount,
            "platformFee": platform_fee,
            "cleanerPayout": cleaner_amount,
            "transfer": transfer_result,
        }
    except stripe.error.StripeError as e:
        logger.error(f"Error releasing payment for job {job_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-connected-account")
async def create_connected_account(data: CreateConnectedAccountRequest, user=Depends(get_current_user)):
    """Create a Stripe Connect account for a cleaner."""
    try:
        account = stripe.Account.create(
            type="express",
            email=data.email,
            country="US",
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            business_profile={"name": data.businessName} if data.businessName else None,
        )
        return {"accountId": account.id}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-account-link")
async def create_account_link(data: OnboardingLinkRequest, user=Depends(get_current_user)):
    """Create an onboarding link for Stripe Connect."""
    try:
        link = stripe.AccountLink.create(
            account=data.accountId,
            refresh_url=data.refreshUrl,
            return_url=data.returnUrl,
            type="account_onboarding",
        )
        return {"url": link.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/account-status/{account_id}")
async def get_account_status(account_id: str, user=Depends(get_current_user)):
    """Get Stripe Connect account status."""
    try:
        account = stripe.Account.retrieve(account_id)
        return {
            "chargesEnabled": account.charges_enabled,
            "payoutsEnabled": account.payouts_enabled,
            "detailsSubmitted": account.details_submitted,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/transfer")
async def create_transfer(amount: int, destination_account_id: str, job_id: str, user=Depends(get_admin_user)):
    """Transfer funds to cleaner after job completion."""
    try:
        transfer = stripe.Transfer.create(
            amount=amount,
            currency="usd",
            destination=destination_account_id,
            metadata={"jobId": job_id},
        )
        return {"transferId": transfer.id, "status": transfer.status}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-checkout-session")
async def create_checkout_session(
    plan: str,
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Create a Stripe Checkout session for subscription or one-time payment."""
    # Map plan IDs to Stripe price IDs and checkout modes
    plan_config = {
        "pay_as_you_go": {
            "price_id": os.getenv("STRIPE_PAY_AS_YOU_GO_PRICE_ID", ""),
            "mode": "payment",
        },
        "weekly_clean": {
            "price_id": os.getenv("STRIPE_WEEKLY_CLEAN_PRICE_ID", ""),
            "mode": "subscription",
        },
        "host_pro": {
            "price_id": os.getenv("STRIPE_HOST_PRO_PRICE_ID", ""),
            "mode": "subscription",
        },
    }
    if plan not in plan_config:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid plan '{plan}'. Choose 'pay_as_you_go', 'weekly_clean', or 'host_pro'.",
        )

    cfg = plan_config[plan]
    if not cfg["price_id"]:
        raise HTTPException(status_code=500, detail=f"Price ID not configured for plan '{plan}'")

    try:
        session = stripe.checkout.Session.create(
            mode=cfg["mode"],
            line_items=[{"price": cfg["price_id"], "quantity": 1}],
            success_url=f"{settings.frontend_url}/cleaner/subscription?success=true",
            cancel_url=f"{settings.frontend_url}/cleaner/subscription?canceled=true",
            metadata={"userId": user["id"], "plan": plan},
            customer_email=user.get("email"),
            allow_promotion_codes=True,  # enables CLEANFRIEND coupon
        )
        return {"url": session.url, "sessionId": session.id}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe checkout error for plan '{plan}': {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/customer-portal")
async def create_customer_portal(user=Depends(get_current_user), db=Depends(get_db)):
    """Create a Stripe customer portal link for subscription management."""
    sub = await db.execute(
        "SELECT stripe_customer_id FROM subscriptions WHERE user_id = :uid AND status = 'active' LIMIT 1",
        {"uid": user["id"]}
    )
    if not sub or not sub[0].get("stripe_customer_id"):
        raise HTTPException(status_code=404, detail="No active subscription found")

    try:
        session = stripe.billing_portal.Session.create(
            customer=sub[0]["stripe_customer_id"],
            return_url=f"{settings.frontend_url}/settings/subscription",
        )
        return {"url": session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def handle_webhook(request: Request):
    """Handle Stripe webhooks — fully wired."""
    if not flags.stripe_webhooks_enabled:
        return {"received": True, "disabled": True}

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Idempotency: skip already-processed events
    if event.id in _processed_webhook_events:
        logger.info(f"Stripe webhook duplicate skipped: {event.id}")
        return {"received": True, "duplicate": True}
    _processed_webhook_events.add(event.id)
    # Cap set size to prevent memory leak (keep last 10k events)
    if len(_processed_webhook_events) > 10000:
        _processed_webhook_events.clear()

    db = await get_db()
    logger.info(f"Stripe webhook received: {event.type}")

    if event.type == "payment_intent.succeeded":
        payment_intent = event.data.object
        job_id = payment_intent.metadata.get("jobId")
        if job_id:
            await db.job.update(
                where={"id": job_id},
                data={"payment_status": "held"}
            )
            # Create notification for client
            job = await db.job.find_unique(where={"id": job_id})
            if job and job.get("client_id"):
                client = await db.clientprofile.find_unique(where={"id": job["client_id"]})
                if client:
                    from app.models import generate_uuid
                    await db.notification.create(data={
                        "id": generate_uuid(),
                        "user_id": client.get("user_id"),
                        "type": "payment_success",
                        "title": "Payment Confirmed",
                        "message": f"Your payment of ${payment_intent.amount / 100:.2f} has been received and held in escrow.",
                        "data": {"jobId": job_id},
                    })
            logger.info(f"Payment succeeded for job {job_id}, amount: ${payment_intent.amount / 100:.2f}")

    elif event.type == "payment_intent.payment_failed":
        payment_intent = event.data.object
        job_id = payment_intent.metadata.get("jobId")
        if job_id:
            await db.job.update(
                where={"id": job_id},
                data={"payment_status": "failed"}
            )
            job = await db.job.find_unique(where={"id": job_id})
            if job and job.get("client_id"):
                client = await db.clientprofile.find_unique(where={"id": job["client_id"]})
                if client:
                    from app.models import generate_uuid
                    await db.notification.create(data={
                        "id": generate_uuid(),
                        "user_id": client.get("user_id"),
                        "type": "payment_failed",
                        "title": "Payment Failed",
                        "message": "Your payment could not be processed. Please update your payment method.",
                        "data": {"jobId": job_id},
                    })
            logger.warning(f"Payment failed for job {job_id}")

    elif event.type == "account.updated":
        account = event.data.object
        # Find cleaner by stripe_account_id and update status
        cleaner = await db.cleaner.find_first(where={"stripe_account_id": account.id})
        if cleaner:
            logger.info(f"Connect account updated for cleaner {cleaner['id']}: charges={account.charges_enabled}")
            if account.charges_enabled and account.payouts_enabled:
                from app.models import generate_uuid
                await db.notification.create(data={
                    "id": generate_uuid(),
                    "user_id": cleaner.get("user_id"),
                    "type": "stripe_active",
                    "title": "Stripe Account Active",
                    "message": "Your Stripe account is now active. You can receive payments!",
                })

    elif event.type == "customer.subscription.created":
        sub = event.data.object
        user_id = sub.metadata.get("userId")
        plan = sub.metadata.get("plan", "pro")
        if user_id:
            from app.models import generate_uuid
            from datetime import datetime
            await db.execute(
                """INSERT INTO subscriptions (id, user_id, stripe_subscription_id, stripe_customer_id, plan, status, current_period_start, current_period_end, created_at, updated_at)
                   VALUES (:id, :uid, :sid, :cid, :plan, :status, :ps, :pe, :now, :now)""",
                {"id": generate_uuid(), "uid": user_id, "sid": sub.id, "cid": sub.customer,
                 "plan": plan, "status": "active",
                 "ps": datetime.fromtimestamp(sub.current_period_start),
                 "pe": datetime.fromtimestamp(sub.current_period_end),
                 "now": datetime.utcnow()}
            )
            logger.info(f"Subscription created for user {user_id}: {plan}")

    elif event.type == "customer.subscription.deleted":
        sub = event.data.object
        await db.execute(
            "UPDATE subscriptions SET status = 'canceled', updated_at = :now WHERE stripe_subscription_id = :sid",
            {"now": __import__('datetime').datetime.utcnow(), "sid": sub.id}
        )
        logger.info(f"Subscription canceled: {sub.id}")

    elif event.type == "charge.dispute.created":
        dispute = event.data.object
        payment_intent_id = dispute.payment_intent
        if payment_intent_id:
            # Find associated job
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            job_id = intent.metadata.get("jobId")
            if job_id:
                await db.job.update(
                    where={"id": job_id},
                    data={"payment_status": "disputed"}
                )
                # Notify admin
                admins = await db.user.find_many(where={"role": "admin"})
                for admin in admins:
                    from app.models import generate_uuid
                    await db.notification.create(data={
                        "id": generate_uuid(),
                        "user_id": admin["id"],
                        "type": "dispute",
                        "title": "⚠️ Payment Dispute",
                        "message": f"A dispute of ${dispute.amount / 100:.2f} was filed for job {job_id}. "
                                   f"Reason: {dispute.reason or 'Not specified'}",
                        "data": {"jobId": job_id, "disputeId": dispute.id},
                    })
                logger.warning(f"Dispute created for job {job_id}: ${dispute.amount / 100:.2f}")

    elif event.type == "charge.refund.updated":
        refund = event.data.object
        if refund.status == "succeeded":
            # Find job via payment intent
            intent = stripe.PaymentIntent.retrieve(refund.payment_intent)
            job_id = intent.metadata.get("jobId")
            if job_id:
                await db.job.update(
                    where={"id": job_id},
                    data={"payment_status": "refunded"}
                )
                logger.info(f"Refund completed for job {job_id}")

    elif event.type == "checkout.session.completed":
        session_obj = event.data.object
        user_id = session_obj.metadata.get("userId")
        plan = session_obj.metadata.get("plan", "unknown")

        if session_obj.mode == "subscription" and user_id:
            # Retrieve the subscription to get period info
            sub_id = session_obj.subscription
            if sub_id:
                sub = stripe.Subscription.retrieve(sub_id)
                from app.models import generate_uuid
                from datetime import datetime
                await db.execute(
                    """INSERT INTO subscriptions (id, user_id, stripe_subscription_id, stripe_customer_id, plan, status, current_period_start, current_period_end, created_at, updated_at)
                       VALUES (:id, :uid, :sid, :cid, :plan, :status, :ps, :pe, :now, :now)
                       ON CONFLICT (stripe_subscription_id) DO NOTHING""",
                    {"id": generate_uuid(), "uid": user_id, "sid": sub.id, "cid": sub.customer,
                     "plan": plan, "status": "active",
                     "ps": datetime.fromtimestamp(sub.current_period_start),
                     "pe": datetime.fromtimestamp(sub.current_period_end),
                     "now": datetime.utcnow()}
                )
            logger.info(f"Checkout completed (subscription) for user {user_id}: plan={plan}")
        elif session_obj.mode == "payment" and user_id:
            logger.info(f"Checkout completed (one-time payment) for user {user_id}: plan={plan}, amount=${session_obj.amount_total / 100:.2f}")
        else:
            logger.info(f"Checkout session completed: mode={session_obj.mode}")

    elif event.type == "invoice.payment_failed":
        invoice = event.data.object
        sub_id = invoice.subscription
        if sub_id:
            from datetime import datetime
            await db.execute(
                "UPDATE subscriptions SET status = 'past_due', updated_at = :now WHERE stripe_subscription_id = :sid",
                {"now": datetime.utcnow(), "sid": sub_id}
            )
            # Try to notify the user
            result = await db.execute(
                "SELECT user_id FROM subscriptions WHERE stripe_subscription_id = :sid LIMIT 1",
                {"sid": sub_id}
            )
            if result and result[0].get("user_id"):
                from app.models import generate_uuid
                await db.notification.create(data={
                    "id": generate_uuid(),
                    "user_id": result[0]["user_id"],
                    "type": "payment_failed",
                    "title": "Subscription Payment Failed",
                    "message": "Your subscription payment failed. Please update your payment method to avoid service interruption.",
                })
            logger.warning(f"Invoice payment failed for subscription {sub_id}")

    return {"received": True}

