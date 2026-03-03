"""
Feature Flags / Kill-Switches for BookACleaner.ai

Runtime toggles for risky integrations. Read from environment on first access,
can be overridden via admin API or env vars without redeployment.

Usage:
    from app.core.feature_flags import flags
    if flags.sms_enabled:
        await sms_service.send_sms(...)
"""
import os
import logging
from typing import Dict

logger = logging.getLogger(__name__)


class FeatureFlags:
    """
    Runtime feature flags backed by environment variables.
    Defaults are safe (everything enabled in production, can be killed).
    """

    def __init__(self):
        self._overrides: Dict[str, bool] = {}
        self._load_from_env()

    def _load_from_env(self):
        """Load flags from environment variables"""
        self._defaults = {
            "sms_enabled": os.getenv("FF_SMS_ENABLED", "true").lower() == "true",
            "ai_chat_enabled": os.getenv("FF_AI_CHAT_ENABLED", "true").lower() == "true",
            "ai_document_parse_enabled": os.getenv("FF_AI_DOCUMENT_PARSE_ENABLED", "true").lower() == "true",
            "email_enabled": os.getenv("FF_EMAIL_ENABLED", "true").lower() == "true",
            "stripe_payments_enabled": os.getenv("FF_STRIPE_PAYMENTS_ENABLED", "true").lower() == "true",
            "stripe_webhooks_enabled": os.getenv("FF_STRIPE_WEBHOOKS_ENABLED", "true").lower() == "true",
            "sponsored_listings_enabled": os.getenv("FF_SPONSORED_ENABLED", "true").lower() == "true",
            "background_checks_enabled": os.getenv("FF_BACKGROUND_CHECKS_ENABLED", "true").lower() == "true",
        }
        logger.info(f"Feature flags loaded: {self._defaults}")

    def _get(self, key: str) -> bool:
        return self._overrides.get(key, self._defaults.get(key, True))

    def set_override(self, key: str, value: bool):
        """Set a runtime override (e.g., from admin API)"""
        self._overrides[key] = value
        logger.warning(f"Feature flag override: {key} = {value}")

    def clear_override(self, key: str):
        """Clear a runtime override, reverting to env/default"""
        self._overrides.pop(key, None)
        logger.info(f"Feature flag override cleared: {key}")

    def to_dict(self) -> Dict[str, bool]:
        """Return all flag values"""
        return {k: self._get(k) for k in self._defaults}

    @property
    def sms_enabled(self) -> bool:
        return self._get("sms_enabled")

    @property
    def ai_chat_enabled(self) -> bool:
        return self._get("ai_chat_enabled")

    @property
    def ai_document_parse_enabled(self) -> bool:
        return self._get("ai_document_parse_enabled")

    @property
    def email_enabled(self) -> bool:
        return self._get("email_enabled")

    @property
    def stripe_payments_enabled(self) -> bool:
        return self._get("stripe_payments_enabled")

    @property
    def stripe_webhooks_enabled(self) -> bool:
        return self._get("stripe_webhooks_enabled")

    @property
    def sponsored_listings_enabled(self) -> bool:
        return self._get("sponsored_listings_enabled")

    @property
    def background_checks_enabled(self) -> bool:
        return self._get("background_checks_enabled")


# Singleton
flags = FeatureFlags()
