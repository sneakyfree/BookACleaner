"""
Sentry SDK integration for error tracking and performance monitoring.

Import and call `init_sentry()` in your app startup (e.g., main.py).
Call `capture_integration_error()` for Stripe/Twilio/OpenAI failures.
"""
import os
import logging

logger = logging.getLogger(__name__)


def _before_send(event, hint):
    """Scrub PII from Sentry events before sending."""
    # Remove Authorization headers
    if "request" in event:
        headers = event["request"].get("headers", {})
        if "Authorization" in headers:
            headers["Authorization"] = "[FILTERED]"
        if "Cookie" in headers:
            headers["Cookie"] = "[FILTERED]"
        # Remove IP address
        if "env" in event["request"]:
            event["request"]["env"].pop("REMOTE_ADDR", None)
    
    # Scrub user email/IP from user context
    if "user" in event:
        event["user"].pop("ip_address", None)

    return event


def init_sentry():
    """
    Initialize Sentry SDK for the backend.
    Reads SENTRY_DSN from environment. No-ops if not configured.
    """
    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        logger.info("Sentry DSN not configured — skipping initialization")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.celery import CeleryIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=os.getenv("ENVIRONMENT", "development"),
            release=os.getenv("APP_VERSION", "0.1.0"),
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_RATE", "0.1")),
            profiles_sample_rate=float(os.getenv("SENTRY_PROFILES_RATE", "0.1")),
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
                CeleryIntegration(),
            ],
            send_default_pii=False,
            before_send=_before_send,
        )
        logger.info("Sentry initialized successfully")
    except ImportError:
        logger.warning("sentry-sdk not installed — pip install sentry-sdk[fastapi]")
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {e}")


def capture_integration_error(
    integration: str,
    error: Exception,
    context: dict = None,
):
    """
    Explicitly capture integration failures (Stripe, Twilio, OpenAI)
    with contextual tags for alerting and triage.
    
    Args:
        integration: "stripe", "twilio", or "openai"
        error: The exception that occurred
        context: Additional context dict (job_id, amount, etc.)
    """
    try:
        import sentry_sdk
        with sentry_sdk.push_scope() as scope:
            scope.set_tag("integration", integration)
            scope.set_tag("error_type", type(error).__name__)
            scope.set_level("error")
            if context:
                for key, value in context.items():
                    scope.set_extra(key, value)
            sentry_sdk.capture_exception(error)
    except ImportError:
        pass  # Sentry not installed, skip
    except Exception:
        pass  # Never let Sentry crash the app

