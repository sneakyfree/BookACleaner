"""
Stripe service for BookACleaner.ai
Wraps the Stripe Python SDK for payment processing and Connect.
"""
import stripe
import logging
from typing import Optional, Dict
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

stripe.api_key = settings.stripe_secret_key


# ==================== PAYMENT INTENTS ====================

async def create_payment_intent(
    amount: int,
    currency: str = "usd",
    customer_id: Optional[str] = None,
    metadata: Optional[Dict[str, str]] = None,
    capture_method: str = "manual",
):
    """Create a payment intent (amount in cents)."""
    params = {
        "amount": amount,
        "currency": currency,
        "automatic_payment_methods": {"enabled": True},
        "capture_method": capture_method,
    }
    if customer_id:
        params["customer"] = customer_id
    if metadata:
        params["metadata"] = metadata
    try:
        return stripe.PaymentIntent.create(**params)
    except stripe.error.StripeError as e:
        logger.error(f"Stripe PaymentIntent error: {e}")
        raise


async def capture_payment_intent(payment_intent_id: str):
    """Capture a previously authorized payment intent."""
    try:
        return stripe.PaymentIntent.capture(payment_intent_id)
    except stripe.error.StripeError as e:
        logger.error(f"Stripe capture error: {e}")
        raise


async def refund_payment(payment_intent_id: str, amount: Optional[int] = None):
    """Refund a payment. If amount is None, full refund."""
    params = {"payment_intent": payment_intent_id}
    if amount:
        params["amount"] = amount
    try:
        return stripe.Refund.create(**params)
    except stripe.error.StripeError as e:
        logger.error(f"Stripe refund error: {e}")
        raise


# ==================== CUSTOMERS ====================

async def create_customer(email: str, name: Optional[str] = None):
    """Create a Stripe customer."""
    try:
        return stripe.Customer.create(email=email, name=name)
    except stripe.error.StripeError as e:
        logger.error(f"Stripe customer creation error: {e}")
        raise


async def attach_payment_method(customer_id: str, payment_method_id: str):
    """Attach a payment method to a customer."""
    try:
        return stripe.PaymentMethod.attach(payment_method_id, customer=customer_id)
    except stripe.error.StripeError as e:
        logger.error(f"Stripe payment method attach error: {e}")
        raise


# ==================== CONNECT (CLEANERS) ====================

async def create_connected_account(
    email: str,
    business_name: Optional[str] = None,
    country: str = "US"
):
    """Create a Stripe Connect express account for a cleaner."""
    try:
        return stripe.Account.create(
            type="express",
            email=email,
            country=country,
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            business_profile={"name": business_name} if business_name else None,
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe Connect account error: {e}")
        raise


async def create_account_link(
    account_id: str,
    refresh_url: str,
    return_url: str
):
    """Create an account link for Stripe Connect onboarding."""
    try:
        return stripe.AccountLink.create(
            account=account_id,
            refresh_url=refresh_url,
            return_url=return_url,
            type="account_onboarding",
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe AccountLink error: {e}")
        raise


async def get_account_status(account_id: str):
    """Get the status of a Stripe Connect account."""
    try:
        account = stripe.Account.retrieve(account_id)
        return {
            "charges_enabled": account.charges_enabled,
            "payouts_enabled": account.payouts_enabled,
            "details_submitted": account.details_submitted,
            "requirements": account.requirements,
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe account status error: {e}")
        raise


async def create_transfer(
    amount: int,
    destination_account_id: str,
    job_id: str
):
    """Create a transfer to a connected account (pay cleaner)."""
    try:
        return stripe.Transfer.create(
            amount=amount,
            currency="usd",
            destination=destination_account_id,
            metadata={"job_id": job_id},
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe transfer error: {e}")
        raise


# ==================== WEBHOOKS ====================

def construct_webhook_event(payload: bytes, signature: str):
    """Construct and verify a Stripe webhook event."""
    try:
        return stripe.Webhook.construct_event(
            payload, signature, settings.stripe_webhook_secret
        )
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Stripe webhook signature error: {e}")
        raise
    except ValueError as e:
        logger.error(f"Stripe webhook payload error: {e}")
        raise
