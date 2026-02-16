from pydantic_settings import BaseSettings
from pydantic import model_validator
from functools import lru_cache
from typing import Optional
import os


# Check if we're in development mode
DEV_MODE = os.getenv("DEV_MODE", "true").lower() == "true"


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # App
    app_name: str = "BookACleaner API"
    debug: bool = DEV_MODE
    api_v1_prefix: str = "/api/v1"
    dev_mode: bool = DEV_MODE

    @model_validator(mode="after")
    def validate_production_secrets(self):
        """Fail-fast: prevent startup with dev secrets in production"""
        if not self.dev_mode:
            if self.jwt_secret == "dev-secret-key-change-in-production-abc123xyz789":
                raise ValueError(
                    "FATAL: JWT_SECRET must be set to a secure value in production. "
                    "Do not use the default dev secret."
                )
            if self.nextauth_secret == "dev-nextauth-secret-change-in-production":
                raise ValueError(
                    "FATAL: NEXTAUTH_SECRET must be set in production."
                )
        return self

    # Database - default for dev mode
    database_url: str = "postgresql://localhost:5432/bookacleaner" if not DEV_MODE else "mock://dev"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Auth - default secret for dev mode (NEVER use in production!)
    jwt_secret: str = "dev-secret-key-change-in-production-abc123xyz789"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # NextAuth
    nextauth_url: str = "http://localhost:3000"
    nextauth_secret: str = "dev-nextauth-secret-change-in-production"

    # Stripe - mock keys for dev
    stripe_secret_key: str = "sk_test_mock_dev_key"
    stripe_publishable_key: str = "pk_test_mock_dev_key"
    stripe_webhook_secret: str = "whsec_mock_dev_key"

    # Twilio - mock for dev
    twilio_account_sid: str = "AC_mock_dev_sid"
    twilio_auth_token: str = "mock_dev_auth_token"
    twilio_phone_number: str = "+15555555555"

    # SendGrid - mock for dev
    sendgrid_api_key: str = "SG.mock_dev_key"
    sendgrid_from_email: str = "noreply@bookacleaner.ai"

    # OpenAI - can be overridden with real key
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "sk-mock-dev-key")

    # Google
    google_maps_api_key: Optional[str] = None
    google_places_api_key: Optional[str] = None

    # AWS
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_s3_bucket: str = "bookacleaner-uploads"
    aws_region: str = "us-east-1"
    cdn_url: Optional[str] = None  # CloudFront CDN URL

    # Frontend URL
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        # Allow extra fields from env
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
