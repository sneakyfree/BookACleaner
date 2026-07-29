"""
GDPR / CCPA Data Privacy API for BookACleaner.ai
Handles user data export (right of access) and deletion (right to be forgotten).
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import json
import logging

from app.database import get_db
from app.config import get_settings
from app.api.deps import get_current_user

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)
@router.get("/export")
async def export_user_data(
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Export all user data as JSON (GDPR Article 15 — Right of Access)"""

    user_id = user["id"]
    logger.info(f"GDPR data export requested by user {user_id}")

    # Collect all user data across tables
    export = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": {
            k: v for k, v in user.items()
            if k not in ("password_hash", "refresh_token", "refresh_token_expires_at")
        },
    }

    # Cleaner profile
    cleaner = await db.cleaner.find_first(where={"user_id": user_id})
    if cleaner:
        export["cleaner_profile"] = cleaner

    # Client profile
    client = await db.client.find_first(where={"user_id": user_id})
    if client:
        export["client_profile"] = client
        # Properties
        properties = await db.properties.find_many(where={"client_id": client["id"]})
        export["properties"] = properties

    # Jobs (as cleaner or client)
    all_jobs = await db.job.find_many()
    my_jobs = [
        j for j in all_jobs
        if j.get("client_id") == (client["id"] if client else None)
        or j.get("cleaner_id") == (cleaner["id"] if cleaner else None)
    ]
    export["jobs"] = my_jobs

    # Reviews authored and received
    all_reviews = await db.review.find_many()
    export["reviews_authored"] = [r for r in all_reviews if r.get("author_id") == user_id]
    export["reviews_received"] = [r for r in all_reviews if r.get("subject_id") == user_id]

    # Messages
    participants = await db.conversation_participant.find_many(where={"user_id": user_id})
    conv_ids = [p["conversation_id"] for p in participants]
    all_messages = await db.message.find_many()
    export["messages"] = [m for m in all_messages if m.get("conversation_id") in conv_ids]

    # Verifications
    verifications = await db.verification.find_many(where={"user_id": user_id})
    export["verifications"] = verifications

    # Notifications
    notifications = await db.notification.find_many(where={"user_id": user_id})
    export["notifications"] = notifications

    return export


# ==================== DATA DELETION (RIGHT TO BE FORGOTTEN) ====================

class DeleteConfirmation(BaseModel):
    confirm: bool = False
    reason: Optional[str] = None


@router.post("/delete")
async def delete_user_data(
    data: DeleteConfirmation,
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Delete all user data (GDPR Article 17 — Right to Erasure)"""

    if not data.confirm:
        raise HTTPException(
            status_code=400,
            detail="Please set confirm=true to proceed with account deletion"
        )

    user_id = user["id"]
    logger.warning(f"GDPR data deletion requested by user {user_id}, reason: {data.reason}")

    deleted = {
        "user_id": user_id,
        "deleted_at": datetime.now(timezone.utc).isoformat(),
        "entities_deleted": [],
    }

    try:
        # Delete notifications
        notifications = await db.notification.find_many(where={"user_id": user_id})
        for n in notifications:
            await db.notification.delete(where={"id": n["id"]})
        deleted["entities_deleted"].append(f"notifications: {len(notifications)}")

        # Delete verifications
        verifications = await db.verification.find_many(where={"user_id": user_id})
        for v in verifications:
            await db.verification.delete(where={"id": v["id"]})
        deleted["entities_deleted"].append(f"verifications: {len(verifications)}")

        # Delete messages
        all_messages = await db.message.find_many(where={"sender_id": user_id})
        for m in all_messages:
            await db.message.update(
                where={"id": m["id"]},
                data={"content": "[deleted]", "attachments": []}
            )
        deleted["entities_deleted"].append(f"messages_anonymized: {len(all_messages)}")

        # Anonymize reviews
        all_reviews = await db.review.find_many()
        authored = [r for r in all_reviews if r.get("author_id") == user_id]
        for r in authored:
            await db.review.update(
                where={"id": r["id"]},
                data={"text": "[deleted]", "photos": []}
            )
        deleted["entities_deleted"].append(f"reviews_anonymized: {len(authored)}")

        # Delete cleaner profile
        cleaner = await db.cleaner.find_first(where={"user_id": user_id})
        if cleaner:
            await db.cleaner.delete(where={"id": cleaner["id"]})
            deleted["entities_deleted"].append("cleaner_profile")

        # Delete client profile and properties
        client = await db.client.find_first(where={"user_id": user_id})
        if client:
            properties = await db.properties.find_many(where={"client_id": client["id"]})
            for p in properties:
                await db.properties.delete(where={"id": p["id"]})
            deleted["entities_deleted"].append(f"properties: {len(properties)}")

            await db.client.delete(where={"id": client["id"]})
            deleted["entities_deleted"].append("client_profile")

        # Sever every remaining reference to this user before deleting the row.
        #
        # The explicit passes above cover the entities we deliberately anonymize
        # (messages, reviews) or cascade by hand (profiles, properties). But
        # ~22 columns across the schema carry a FK to users.id — email/phone
        # verifications, password resets, subscriptions, badges, feed likes,
        # dispute and moderation actors, support tickets. Any one left behind
        # made the final DELETE raise a FK violation, so "delete my account"
        # returned 500 and erased NOTHING. SQLite does not enforce FKs by
        # default, so the whole class of failure was invisible in tests.
        #
        # Introspecting the FK graph (rather than hand-listing tables) means a
        # newly added table referencing users is handled automatically instead
        # of silently reintroducing this bug.
        from app.models import Base

        severed = []
        for table in reversed(Base.metadata.sorted_tables):
            if table.name == "users":
                continue
            for column in table.columns:
                refs_users = any(
                    fk.column.table.name == "users" for fk in column.foreign_keys
                )
                if not refs_users:
                    continue
                if column.nullable:
                    # Keep the record (it may belong to the counterparty or be
                    # needed for audit), but unlink it from the erased user.
                    result = await db.execute(
                        f"UPDATE {table.name} SET {column.name} = NULL "
                        f"WHERE {column.name} = :uid",
                        {"uid": user_id},
                    )
                else:
                    # The row cannot exist without its user — remove it.
                    result = await db.execute(
                        f"DELETE FROM {table.name} WHERE {column.name} = :uid",
                        {"uid": user_id},
                    )
                rows = getattr(result, "rowcount", None) or 0
                if rows:
                    verb = "unlinked" if column.nullable else "deleted"
                    severed.append(f"{table.name}.{column.name} {verb}: {rows}")
        if severed:
            deleted["entities_deleted"].extend(severed)

        # Delete user account
        await db.user.delete(where={"id": user_id})
        deleted["entities_deleted"].append("user_account")

        logger.info(f"GDPR deletion complete for user {user_id}: {deleted['entities_deleted']}")

    except Exception as e:
        logger.error(f"GDPR deletion error for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Data deletion encountered an error. Support has been notified.")

    return {
        "message": "Your account and all associated data have been permanently deleted.",
        "details": deleted,
    }
