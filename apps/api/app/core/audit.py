"""Audit trail helper — records privileged admin actions.

Auditing must never break the action it is recording, so failures here are
logged and swallowed rather than propagated.
"""
import logging

logger = logging.getLogger(__name__)


async def record_audit(db, *, event_type: str, actor: dict | None = None,
                       target: str | None = None, details: str | None = None) -> None:
    """Append an entry to the audit log.

    `actor` is the authenticated user dict (id/email/full_name/role); we store a
    human label plus id/role so the admin UI can show who did what.
    """
    try:
        actor = actor or {}
        await db.audit_log.create(data={
            "event_type": event_type,
            "actor": actor.get("full_name") or actor.get("email") or actor.get("id"),
            "actor_id": actor.get("id"),
            "actor_role": actor.get("role"),
            "target": target,
            "details": details,
        })
    except Exception as e:  # never let auditing break the underlying action
        logger.error(f"Failed to record audit event {event_type}: {e}")
