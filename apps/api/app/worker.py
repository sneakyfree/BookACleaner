"""
Celery worker for BookACleaner.ai background tasks.
Start with: celery -A app.worker worker --loglevel=info
Beat:        celery -A app.worker beat --loglevel=info
"""
import logging
from celery import Celery
from celery.schedules import crontab
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Celery
celery_app = Celery(
    "bookacleaner",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 min hard limit
    task_soft_time_limit=240,  # 4 min soft limit
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# ==================== PERIODIC TASKS ====================

celery_app.conf.beat_schedule = {
    "sync-all-ical-properties": {
        "task": "app.worker.sync_all_ical_properties",
        "schedule": crontab(minute="*/15"),  # Every 15 minutes
    },
    "recalculate-all-ratings": {
        "task": "app.worker.recalculate_all_ratings",
        "schedule": crontab(hour="3", minute="0"),  # Daily at 3 AM
    },
    "evaluate-all-badges": {
        "task": "app.worker.evaluate_all_badges",
        "schedule": crontab(hour="4", minute="0"),  # Daily at 4 AM
    },
}


# ==================== EMAIL TASKS ====================

@celery_app.task(name="app.worker.send_email_task", bind=True, max_retries=3)
def send_email_task(self, to: str, subject: str, html: str):
    """Send email asynchronously via SendGrid"""
    try:
        import asyncio
        from app.services.email import EmailService
        
        service = EmailService()
        asyncio.get_event_loop().run_until_complete(
            service.send(to=to, subject=subject, html_content=html)
        )
        logger.info(f"Email sent to {to}: {subject}")
    except Exception as exc:
        logger.error(f"Email send failed: {exc}")
        self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


# ==================== SMS TASKS ====================

@celery_app.task(name="app.worker.send_sms_task", bind=True, max_retries=3)
def send_sms_task(self, to: str, body: str):
    """Send SMS asynchronously via Twilio"""
    try:
        import asyncio
        from app.services.sms import SMSService
        
        service = SMSService()
        asyncio.get_event_loop().run_until_complete(
            service.send(to=to, message=body)
        )
        logger.info(f"SMS sent to {to}")
    except Exception as exc:
        logger.error(f"SMS send failed: {exc}")
        self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


# ==================== ICAL SYNC TASKS ====================

@celery_app.task(name="app.worker.sync_ical_task")
def sync_ical_task(property_id: str):
    """Sync a single property's iCal calendar"""
    try:
        import asyncio
        from app.services.ical_sync import ICalSyncService
        
        service = ICalSyncService()
        asyncio.get_event_loop().run_until_complete(
            service.sync_property(property_id)
        )
        logger.info(f"iCal synced for property {property_id}")
    except Exception as exc:
        logger.error(f"iCal sync failed for {property_id}: {exc}")


@celery_app.task(name="app.worker.sync_all_ical_properties")
def sync_all_ical_properties():
    """Periodic: sync all properties with iCal URLs"""
    try:
        import asyncio
        from app.database import db
        
        async def _sync_all():
            properties = await db.properties.find_many()
            for prop in properties:
                if prop.get("airbnb_calendar_url"):
                    sync_ical_task.delay(prop["id"])
        
        asyncio.get_event_loop().run_until_complete(_sync_all())
        logger.info("Queued iCal sync for all properties")
    except Exception as exc:
        logger.error(f"Bulk iCal sync failed: {exc}")


# ==================== RATING / BADGE TASKS ====================

@celery_app.task(name="app.worker.recalculate_rating_task")
def recalculate_rating_task(user_id: str):
    """Recalculate a cleaner's rating from all their reviews"""
    try:
        import asyncio
        from app.database import db
        
        async def _recalculate():
            reviews = await db.review.find_many(where={"subject_id": user_id})
            if not reviews:
                return
            
            total = sum(r.get("rating", 0) for r in reviews)
            count = len(reviews)
            avg = round(total / count, 2) if count > 0 else 0
            
            # Update cleaner profile
            cleaner = await db.cleaner.find_first(where={"user_id": user_id})
            if cleaner:
                await db.cleaner.update(
                    where={"id": cleaner["id"]},
                    data={"rating": avg, "review_count": count}
                )
            logger.info(f"Rating recalculated for {user_id}: {avg} ({count} reviews)")
        
        asyncio.get_event_loop().run_until_complete(_recalculate())
    except Exception as exc:
        logger.error(f"Rating recalculation failed for {user_id}: {exc}")


@celery_app.task(name="app.worker.recalculate_all_ratings")
def recalculate_all_ratings():
    """Periodic: recalculate all cleaner ratings"""
    try:
        import asyncio
        from app.database import db
        
        async def _recalc_all():
            cleaners = await db.cleaner.find_many()
            for c in cleaners:
                recalculate_rating_task.delay(c["user_id"])
        
        asyncio.get_event_loop().run_until_complete(_recalc_all())
    except Exception as exc:
        logger.error(f"Bulk rating recalculation failed: {exc}")


@celery_app.task(name="app.worker.award_badges_task")
def award_badges_task(user_id: str):
    """Evaluate and award badges for a user"""
    try:
        import asyncio
        from app.services.badge_engine import BadgeEngine
        
        engine = BadgeEngine()
        asyncio.get_event_loop().run_until_complete(
            engine.evaluate_user(user_id)
        )
        logger.info(f"Badges evaluated for {user_id}")
    except Exception as exc:
        logger.error(f"Badge evaluation failed for {user_id}: {exc}")


@celery_app.task(name="app.worker.evaluate_all_badges")
def evaluate_all_badges():
    """Periodic: evaluate badges for all users"""
    try:
        import asyncio
        from app.database import db
        
        async def _eval_all():
            users = await db.user.find_many()
            for u in users:
                award_badges_task.delay(u["id"])
        
        asyncio.get_event_loop().run_until_complete(_eval_all())
    except Exception as exc:
        logger.error(f"Bulk badge evaluation failed: {exc}")


# ==================== DOCUMENT PROCESSING TASKS ====================

@celery_app.task(name="app.worker.process_document_task")
def process_document_task(verification_id: str):
    """Process a verification document with AI"""
    try:
        import asyncio
        from app.services.background_check import BackgroundCheckService
        
        service = BackgroundCheckService()
        asyncio.get_event_loop().run_until_complete(
            service.process_verification(verification_id)
        )
        logger.info(f"Document processed for verification {verification_id}")
    except Exception as exc:
        logger.error(f"Document processing failed for {verification_id}: {exc}")


# ==================== JOB TASKS ====================

@celery_app.task(name="app.worker.create_turnover_jobs_task")
def create_turnover_jobs_task(property_id: str):
    """Auto-create turnover jobs from iCal checkout events"""
    try:
        import asyncio
        from app.services.ical_sync import ICalSyncService
        
        service = ICalSyncService()
        asyncio.get_event_loop().run_until_complete(
            service.create_turnover_jobs(property_id)
        )
        logger.info(f"Turnover jobs created for property {property_id}")
    except Exception as exc:
        logger.error(f"Turnover job creation failed for {property_id}: {exc}")


# ==================== PAYMENT TASKS ====================

@celery_app.task(name="app.worker.release_payment_task", bind=True, max_retries=3)
def release_payment_task(self, job_id: str):
    """Release escrow payment on job completion: capture PI + transfer to cleaner"""
    try:
        import asyncio
        import stripe
        from app.database import db

        stripe.api_key = settings.stripe_secret_key

        async def _release():
            # Get job details
            job = await db.job.find_unique(where={"id": job_id})
            if not job:
                logger.error(f"Job {job_id} not found for payment release")
                return

            payment_id = job.get("stripe_payment_id")
            if not payment_id:
                logger.warning(f"Job {job_id} has no Stripe payment ID, skipping release")
                return

            # Get cleaner's Stripe account
            cleaner = await db.cleaner.find_first(where={"id": job.get("cleaner_id")})
            if not cleaner or not cleaner.get("stripe_account_id"):
                logger.warning(f"Cleaner for job {job_id} has no Stripe account")
                return

            # 1. Capture the payment intent (moves from hold → captured)
            pi = stripe.PaymentIntent.capture(payment_id)
            amount_captured = pi.amount_received  # in cents

            # 2. Calculate platform fee (15%)
            platform_fee = int(amount_captured * 0.15)
            cleaner_payout = amount_captured - platform_fee

            # 3. Transfer to cleaner's Connected account
            transfer = stripe.Transfer.create(
                amount=cleaner_payout,
                currency="usd",
                destination=cleaner["stripe_account_id"],
                transfer_group=f"job_{job_id}",
                metadata={"job_id": job_id, "platform_fee": platform_fee},
            )

            # 4. Update job payment status
            await db.job.update(
                where={"id": job_id},
                data={
                    "payment_status": "released",
                    "paid_out_at": __import__("datetime").datetime.utcnow(),
                }
            )

            logger.info(
                f"Payment released for job {job_id}: "
                f"${amount_captured/100:.2f} captured, "
                f"${cleaner_payout/100:.2f} to cleaner, "
                f"${platform_fee/100:.2f} platform fee"
            )

        asyncio.get_event_loop().run_until_complete(_release())
    except Exception as exc:
        logger.error(f"Payment release failed for job {job_id}: {exc}")
        self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

