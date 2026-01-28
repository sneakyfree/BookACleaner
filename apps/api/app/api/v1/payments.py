from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import stripe
import os

from app.config import get_settings

router = APIRouter()
settings = get_settings()

# Configure Stripe
stripe.api_key = settings.stripe_secret_key


class CreatePaymentIntentRequest(BaseModel):
    amount: int  # in cents
    jobId: str
    customerId: Optional[str] = None


class CreateConnectedAccountRequest(BaseModel):
    email: str
    businessName: Optional[str] = None


class OnboardingLinkRequest(BaseModel):
    accountId: str
    returnUrl: str
    refreshUrl: str


@router.post("/create-payment-intent")
async def create_payment_intent(data: CreatePaymentIntentRequest):
    """Create a payment intent for a job booking"""
    try:
        intent = stripe.PaymentIntent.create(
            amount=data.amount,
            currency="usd",
            customer=data.customerId,
            metadata={"jobId": data.jobId},
            automatic_payment_methods={"enabled": True},
        )
        return {
            "clientSecret": intent.client_secret,
            "paymentIntentId": intent.id,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/capture-payment/{payment_intent_id}")
async def capture_payment(payment_intent_id: str):
    """Capture a payment (after job is completed)"""
    try:
        intent = stripe.PaymentIntent.capture(payment_intent_id)
        return {"status": intent.status}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/refund/{payment_intent_id}")
async def refund_payment(payment_intent_id: str, amount: Optional[int] = None):
    """Refund a payment"""
    try:
        refund = stripe.Refund.create(
            payment_intent=payment_intent_id,
            amount=amount,  # None = full refund
        )
        return {"refundId": refund.id, "status": refund.status}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-connected-account")
async def create_connected_account(data: CreateConnectedAccountRequest):
    """Create a Stripe Connect account for a cleaner"""
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
async def create_account_link(data: OnboardingLinkRequest):
    """Create an onboarding link for Stripe Connect"""
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
async def get_account_status(account_id: str):
    """Get Stripe Connect account status"""
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
async def create_transfer(
    amount: int,
    destination_account_id: str,
    job_id: str,
):
    """Transfer funds to cleaner after job completion"""
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


@router.post("/webhook")
async def handle_webhook(request: Request):
    """Handle Stripe webhooks"""
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

    # Handle events
    if event.type == "payment_intent.succeeded":
        payment_intent = event.data.object
        # Update job payment status
        job_id = payment_intent.metadata.get("jobId")
        # await update_job_payment_status(job_id, "PAID")

    elif event.type == "payment_intent.payment_failed":
        payment_intent = event.data.object
        # Handle failed payment
        pass

    elif event.type == "account.updated":
        # Connect account updated
        account = event.data.object
        # Update cleaner's account status
        pass

    return {"received": True}
