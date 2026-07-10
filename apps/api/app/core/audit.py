"""Audit trail helper — records privileged admin actions.

Auditing must never break the action it is recording, so failures here are
logged and swallowed rather than propagated. Because failures are swallowed, we
also record the last error so the admin UI can surface an "audit not recording"
warning instead of silently showing an empty trail (e.g. when the audit_logs
table is missing on a migrations-only prod DB).
"""
import logging

logger = logging.getLogger(__name__)

# Health signal for the admin UI. `record_audit` never raises, so without this
# a broken audit sink (missing table, DB error) would look identical to "no
# actions yet". Surfaced via GET /admin/audit.
_last_error: str | None = None
_healthy: bool = True


def audit_health() -> dict:
    """Whether audit writes are currently succeeding."""
    return {"healthy": _healthy, "last_error": _last_error}


async def record_audit(db, *, event_type: str, actor: dict | None = None,
                       target: str | None = None, details: str | None = None) -> None:
    """Append an entry to the audit log.

    `actor` is the authenticated user dict (id/email/full_name/role); we store a
    human label plus id/role so the admin UI can show who did what.
    """
    global _last_error, _healthy
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
        _healthy = True
        _last_error = None
    except Exception as e:  # never let auditing break the underlying action
        _healthy = False
        _last_error = str(e)
        logger.error(f"Failed to record audit event {event_type}: {e}")
