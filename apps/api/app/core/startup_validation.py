"""
BookACleaner Startup Validation
Validates required environment variables and dependencies on startup
"""

import os
import logging
from typing import List, Tuple

logger = logging.getLogger(__name__)


class StartupValidationError(Exception):
    """Raised when startup validation fails"""
    pass


def validate_environment() -> Tuple[bool, List[str]]:
    """
    Validate all required environment variables are set.
    
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors: List[str] = []
    warnings: List[str] = []
    
    # Critical: These must be set for the app to function
    critical_vars = [
        ("DATABASE_URL", "PostgreSQL connection (start docker-compose up db)"),
        ("JWT_SECRET", "JWT token signing secret"),
        ("NEXTAUTH_SECRET", "NextAuth session secret"),
    ]
    
    # Important: These should be set for full functionality
    important_vars = [
        ("STRIPE_SECRET_KEY", "Stripe payment processing"),
        ("STRIPE_PUBLISHABLE_KEY", "Stripe frontend integration"),
        ("SENDGRID_API_KEY", "Email delivery"),
        ("TWILIO_ACCOUNT_SID", "SMS delivery"),
        ("TWILIO_AUTH_TOKEN", "SMS authentication"),
    ]
    
    # Optional: Nice to have for enhanced features
    optional_vars = [
        ("GOOGLE_CLIENT_ID", "Google OAuth login"),
        ("GOOGLE_CLIENT_SECRET", "Google OAuth"),
        ("CHECKR_API_KEY", "Background checks"),
        ("FIREBASE_PROJECT_ID", "Push notifications"),
    ]
    
    # Check critical variables
    for var, description in critical_vars:
        value = os.getenv(var)
        if not value:
            # Provide defaults for dev mode
            if var == "DATABASE_URL":
                os.environ[var] = "postgresql+asyncpg://bookacleaner:password@localhost:5432/bookacleaner"
                warnings.append(f"{var} not set, using docker-compose PostgreSQL default")
            elif var == "JWT_SECRET":
                os.environ[var] = "dev-secret-change-in-production"
                warnings.append(f"{var} not set, using dev default (CHANGE IN PRODUCTION)")
            elif var == "NEXTAUTH_SECRET":
                os.environ[var] = "dev-nextauth-secret"
                warnings.append(f"{var} not set, using dev default")
            else:
                errors.append(f"CRITICAL: {var} is not set ({description})")
    
    # Check important variables (warn but don't fail)
    for var, description in important_vars:
        if not os.getenv(var):
            warnings.append(f"WARNING: {var} not set - {description} will use mock mode")
    
    # Check optional variables (info only)
    for var, description in optional_vars:
        if not os.getenv(var):
            logger.info(f"Optional: {var} not set - {description} disabled")
    
    # Log all warnings
    for warning in warnings:
        logger.warning(warning)
    
    # Log all errors
    for error in errors:
        logger.error(error)
    
    return len(errors) == 0, errors


def validate_dependencies() -> Tuple[bool, List[str]]:
    """
    Validate required Python packages are installed.
    
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors: List[str] = []
    
    required_packages = [
        ("fastapi", "FastAPI"),
        ("sqlalchemy", "SQLAlchemy"),
        ("pydantic", "Pydantic"),
        ("jose", "python-jose (JWT)"),
        ("bcrypt", "bcrypt (password hashing)"),
    ]
    
    for package, name in required_packages:
        try:
            __import__(package)
        except ImportError:
            errors.append(f"Required package not installed: {name} ({package})")
    
    return len(errors) == 0, errors


def run_startup_validation(strict: bool = False) -> bool:
    """
    Run all startup validations.
    
    Args:
        strict: If True, raise exception on any error. If False, log and continue.
        
    Returns:
        True if all validations passed, False otherwise
    """
    logger.info("Running startup validation...")
    
    all_valid = True
    all_errors: List[str] = []
    
    # Validate environment
    env_valid, env_errors = validate_environment()
    if not env_valid:
        all_valid = False
        all_errors.extend(env_errors)
    
    # Validate dependencies
    deps_valid, deps_errors = validate_dependencies()
    if not deps_valid:
        all_valid = False
        all_errors.extend(deps_errors)
    
    if all_valid:
        logger.info("✅ Startup validation passed")
    else:
        logger.error(f"❌ Startup validation failed with {len(all_errors)} errors")
        for error in all_errors:
            logger.error(f"  - {error}")
        
        if strict:
            raise StartupValidationError(
                f"Startup validation failed: {'; '.join(all_errors)}"
            )
    
    return all_valid
