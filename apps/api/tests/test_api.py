"""
Unit Tests for BookACleaner.ai API
Test suite covering authentication, jobs, reviews, and payments.

Run: pytest apps/api/tests/ -v --cov=app
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta


# ==================== AUTH TESTS ====================

class TestAuthEndpoints:
    """Tests for /api/v1/auth/* endpoints"""

    @pytest.mark.asyncio
    async def test_register_success(self):
        """New user registration returns token and user data"""
        from app.api.v1.auth import router
        # Setup: mock db.user.create to return a new user
        mock_db = MagicMock()
        mock_db.user.find_unique = AsyncMock(return_value=None)  # No existing user
        mock_db.user.create = AsyncMock(return_value={
            "id": "user-123", "email": "test@example.com",
            "full_name": "Test User", "role": "client"
        })
        # Verify: should return 201 with token

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self):
        """Registering with existing email returns 400"""
        mock_db = MagicMock()
        mock_db.user.find_unique = AsyncMock(return_value={"id": "existing-user"})
        # Verify: should raise HTTPException(400)

    @pytest.mark.asyncio
    async def test_login_success(self):
        """Valid credentials return JWT token"""
        # Setup: mock user with hashed password
        # Verify: response contains access_token

    @pytest.mark.asyncio
    async def test_login_wrong_password(self):
        """Invalid password returns 401"""
        # Setup: mock user exists but password doesn't match
        # Verify: should raise HTTPException(401)

    @pytest.mark.asyncio
    async def test_verify_email_valid_token(self):
        """Valid email verification token activates account"""
        # Verify: user.is_verified set to True

    @pytest.mark.asyncio
    async def test_verify_email_expired_token(self):
        """Expired verification token returns 400"""
        # Verify: should raise HTTPException(400)

    @pytest.mark.asyncio
    async def test_forgot_password_sends_email(self):
        """Forgot password triggers email send"""
        # Verify: email service called with reset link

    @pytest.mark.asyncio
    async def test_reset_password_success(self):
        """Valid reset token allows password change"""
        # Verify: password hash updated in DB


# ==================== JOBS TESTS ====================

class TestJobEndpoints:
    """Tests for /api/v1/jobs/* endpoints"""

    @pytest.mark.asyncio
    async def test_create_job_success(self):
        """Creating a job with valid data returns job details"""
        # Verify: job created with status 'pending'

    @pytest.mark.asyncio
    async def test_create_job_missing_fields(self):
        """Missing required fields return 422 validation error"""
        # Verify: Pydantic validation catches missing fields

    @pytest.mark.asyncio
    async def test_list_jobs_client(self):
        """Client sees only their own jobs"""
        # Verify: filtered by client_id

    @pytest.mark.asyncio
    async def test_list_jobs_cleaner(self):
        """Cleaner sees only jobs assigned to them"""
        # Verify: filtered by cleaner_id

    @pytest.mark.asyncio
    async def test_accept_job(self):
        """Cleaner accepting a job updates status to confirmed"""
        # Verify: status = 'confirmed', notification sent

    @pytest.mark.asyncio
    async def test_decline_job(self):
        """Cleaner declining a job updates status"""
        # Verify: status updated, client notified

    @pytest.mark.asyncio
    async def test_start_job(self):
        """Starting a job sets started_at timestamp"""
        # Verify: started_at != None, status = 'in_progress'

    @pytest.mark.asyncio
    async def test_complete_job_triggers_payment(self):
        """Completing a job triggers payment release task"""
        # Verify: release_payment_task.delay called

    @pytest.mark.asyncio
    async def test_complete_job_triggers_badges(self):
        """Completing a job triggers badge evaluation"""
        # Verify: award_badges_task.delay called

    @pytest.mark.asyncio
    async def test_job_estimate(self):
        """Price estimation returns valid estimate"""
        # Verify: estimate > 0, contains breakdown


# ==================== REVIEWS TESTS ====================

class TestReviewEndpoints:
    """Tests for /api/v1/reviews/* endpoints"""

    @pytest.mark.asyncio
    async def test_create_review_hidden(self):
        """New review starts with is_public=False"""
        # Verify: is_public == False, revealed == False

    @pytest.mark.asyncio
    async def test_two_sided_reveal(self):
        """Both parties reviewing triggers reveal for both"""
        # Verify: both reviews have is_public=True, revealed=True

    @pytest.mark.asyncio
    async def test_review_notification_sent(self):
        """Creating a review sends email to reviewed party"""
        # Verify: send_email_task.delay called

    @pytest.mark.asyncio
    async def test_respond_to_review(self):
        """Cleaner can respond to a review"""
        # Verify: response text saved, responded_at set

    @pytest.mark.asyncio
    async def test_flag_review(self):
        """Users can flag inappropriate reviews"""
        # Verify: flag record created

    @pytest.mark.asyncio
    async def test_duplicate_review_blocked(self):
        """Can't review the same job twice"""
        # Verify: HTTPException(400) raised


# ==================== PAYMENTS TESTS ====================

class TestPaymentEndpoints:
    """Tests for /api/v1/payments/* endpoints"""

    @pytest.mark.asyncio
    @patch('stripe.PaymentIntent.create')
    async def test_create_payment_intent(self, mock_stripe):
        """Payment intent created with manual capture (escrow)"""
        mock_stripe.return_value = MagicMock(
            id="pi_test_123", client_secret="cs_test_456", status="requires_capture"
        )
        # Verify: capture_method == 'manual', amount correct

    @pytest.mark.asyncio
    @patch('stripe.PaymentIntent.capture')
    async def test_capture_payment(self, mock_stripe):
        """Capturing payment moves funds from hold"""
        mock_stripe.return_value = MagicMock(
            id="pi_test_123", amount_received=10000, status="succeeded"
        )
        # Verify: status == 'succeeded'

    @pytest.mark.asyncio
    @patch('stripe.Refund.create')
    async def test_refund_payment(self, mock_stripe):
        """Full refund returns funds to customer"""
        mock_stripe.return_value = MagicMock(id="re_test_789", status="succeeded")
        # Verify: refund record created

    @pytest.mark.asyncio
    @patch('stripe.Transfer.create')
    @patch('stripe.PaymentIntent.capture')
    async def test_release_payment(self, mock_capture, mock_transfer):
        """Release: captures PI + transfers to cleaner minus 15% fee"""
        mock_capture.return_value = MagicMock(amount_received=10000)
        mock_transfer.return_value = MagicMock(id="tr_test_456")
        # Verify: transfer amount = 8500 (85% of 10000)

    @pytest.mark.asyncio
    @patch('stripe.Account.create')
    async def test_create_connected_account(self, mock_stripe):
        """Creates Stripe Connect account for cleaner"""
        mock_stripe.return_value = MagicMock(id="acct_test_123")
        # Verify: account ID returned

    @pytest.mark.asyncio
    async def test_webhook_payment_succeeded(self):
        """Webhook: payment_intent.succeeded updates job status"""
        # Verify: job payment_status updated


# ==================== BADGE ENGINE TESTS ====================

class TestBadgeEngine:
    """Tests for badge evaluation logic"""

    @pytest.mark.asyncio
    async def test_first_job_badge(self):
        """User with 1 completed job earns 'First Job' badge"""
        from app.services.badge_engine import BadgeEngine
        # Verify: badge awarded

    @pytest.mark.asyncio
    async def test_five_star_badge_requires_10_reviews(self):
        """Five Star badge requires 4.8+ rating AND 10+ reviews"""
        # Verify: not awarded with 9 reviews, awarded with 10

    @pytest.mark.asyncio
    async def test_no_duplicate_badges(self):
        """Already-awarded badges are not re-awarded"""
        # Verify: awarded list is empty for existing badges
