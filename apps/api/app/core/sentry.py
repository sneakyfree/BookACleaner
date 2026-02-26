"""
Sentry SDK integration for error tracking and performance monitoring.

Import and call `init_sentry()` in your app startup (e.g., main.py).
"""
import os
import logging

logger = logging.getLogger(__name__)


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
        )
        logger.info("Sentry initialized successfully")
    except ImportError:
        logger.warning("sentry-sdk not installed — pip install sentry-sdk[fastapi]")
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {e}")
