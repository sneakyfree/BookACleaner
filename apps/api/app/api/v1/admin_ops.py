"""
Owner-console admin endpoints: billing/payments, support queue, and
traffic/geographic analytics. All routes are admin-gated and mounted under
/admin (registered alongside admin.router).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
import logging

from app.database import get_db
from app.config import get_settings
from app.api.deps import get_admin_user
from app.core.audit import record_audit

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)

PLATFORM_FEE_PCT = 15
_RANGE_DAYS = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}


def _dt(value):
    """Parse a stored timestamp to aware-UTC, or None."""
    if not value:
        return None
    try:
        d = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


async def _user_label(db, user_id):
    if not user_id:
        return None
    u = await db.user.find_unique(where={"id": user_id})
    if not u:
        return None
    return {"id": u["id"], "name": u.get("full_name") or u.get("email"), "email": u.get("email")}


# ==================== BILLING / PAYMENTS ====================

@router.get("/billing/overview")
async def billing_overview(admin=Depends(get_admin_user), db=Depends(get_db)):
    """Money at a glance: gross, fees, net owed to cleaners, refunds, and the
    breakdown of jobs by payment_status + subscriptions by plan."""
    jobs = await db.job.find_many() or []
    subs = await db.subscription.find_many() or []

    completed = [j for j in jobs if j.get("status") == "completed"]
    gross = sum(float(j.get("total_price") or 0) for j in completed)
    fee = round(gross * PLATFORM_FEE_PCT / 100, 2)
    net_to_cleaners = round(gross - fee, 2)

    by_payment_status = {}
    for j in jobs:
        ps = j.get("payment_status") or "pending"
        by_payment_status[ps] = by_payment_status.get(ps, 0) + 1

    refunded = [j for j in jobs if j.get("payment_status") == "refunded"]
    refunded_amount = round(sum(float(j.get("total_price") or 0) for j in refunded), 2)

    # Money that's captured/held but not yet paid out to a cleaner.
    outstanding = round(sum(
        float(j.get("total_price") or 0) * (100 - PLATFORM_FEE_PCT) / 100
        for j in completed if not j.get("paid_out_at")
    ), 2)

    subs_by_plan = {}
    active_subs = 0
    for s in subs:
        if (s.get("status") or "") in ("active", "one_time"):
            active_subs += 1
            plan = s.get("plan") or "free"
            subs_by_plan[plan] = subs_by_plan.get(plan, 0) + 1

    return {
        "gross_revenue": round(gross, 2),
        "platform_fee": fee,
        "net_to_cleaners": net_to_cleaners,
        "refunded_amount": refunded_amount,
        "refunded_count": len(refunded),
        "outstanding_payouts": outstanding,
        "jobs_by_payment_status": by_payment_status,
        "active_subscriptions": active_subs,
        "subscriptions_by_plan": subs_by_plan,
    }


@router.get("/billing/transactions")
async def billing_transactions(
    payment_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    admin=Depends(get_admin_user),
    db=Depends(get_db),
):
    """Job-derived transaction ledger (each completed/charged job is a txn)."""
    jobs = await db.job.find_many() or []
    if payment_status:
        jobs = [j for j in jobs if (j.get("payment_status") or "pending") == payment_status]
    jobs.sort(key=lambda j: str(j.get("paid_at") or j.get("created_at") or ""), reverse=True)
    total = len(jobs)
    start = (page - 1) * limit
    page_items = jobs[start:start + limit]

    rows = []
    for j in page_items:
        gross = float(j.get("total_price") or 0)
        fee = round(gross * PLATFORM_FEE_PCT / 100, 2)
        # Resolve the human names behind the profile ids.
        client = await db.client.find_unique(where={"id": j.get("client_id")}) if j.get("client_id") else None
        cleaner = await db.cleaner.find_unique(where={"id": j.get("cleaner_id")}) if j.get("cleaner_id") else None
        rows.append({
            "job_id": j["id"],
            "title": j.get("title"),
            "amount": round(gross, 2),
            "platform_fee": fee,
            "net": round(gross - fee, 2),
            "status": j.get("status"),
            "payment_status": j.get("payment_status") or "pending",
            "stripe_payment_intent_id": j.get("stripe_payment_intent_id"),
            "client": (await _user_label(db, client.get("user_id"))) if client else None,
            "cleaner_business": cleaner.get("business_name") if cleaner else None,
            "paid_at": j.get("paid_at"),
            "created_at": j.get("created_at"),
        })
    return {"transactions": rows, "total": total, "page": page, "limit": limit}


@router.get("/billing/user/{user_id}")
async def billing_for_user(user_id: str, admin=Depends(get_admin_user), db=Depends(get_db)):
    """A single user's billing picture — charges (as client), payouts (as
    cleaner), and subscription — for resolving a billing complaint."""
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    client = await db.client.find_first(where={"user_id": user_id})
    cleaner = await db.cleaner.find_first(where={"user_id": user_id})

    charges = []
    if client:
        for j in await db.job.find_many(where={"client_id": client["id"]}) or []:
            charges.append({
                "job_id": j["id"], "title": j.get("title"),
                "amount": round(float(j.get("total_price") or 0), 2),
                "payment_status": j.get("payment_status") or "pending",
                "paid_at": j.get("paid_at"), "created_at": j.get("created_at"),
            })

    payouts = []
    if cleaner:
        for j in await db.job.find_many(where={"cleaner_id": cleaner["id"]}) or []:
            if j.get("status") != "completed":
                continue
            gross = float(j.get("total_price") or 0)
            payouts.append({
                "job_id": j["id"], "title": j.get("title"),
                "net": round(gross * (100 - PLATFORM_FEE_PCT) / 100, 2),
                "paid_out": bool(j.get("paid_out_at")),
                "paid_out_at": j.get("paid_out_at"), "created_at": j.get("created_at"),
            })

    subs = await db.subscription.find_many(where={"user_id": user_id}) or []
    subs.sort(key=lambda s: str(s.get("created_at") or ""), reverse=True)

    await record_audit(db, event_type="billing.viewed", actor=admin,
                       target=user_id, details=f"Admin viewed billing for {user.get('email')}")
    return {
        "user": await _user_label(db, user_id),
        "charges": charges,
        "payouts": payouts,
        "subscription": subs[0] if subs else None,
    }


@router.post("/billing/refund/{job_id}")
async def billing_refund(job_id: str, admin=Depends(get_admin_user), db=Depends(get_db)):
    """Refund a job's payment. Surfaces the refund capability in the admin UI
    (the raw payments endpoint keyed by intent id was never reachable here).
    Idempotent; audited."""
    job = await db.job.find_unique(where={"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("payment_status") == "refunded":
        raise HTTPException(status_code=409, detail="Already refunded")
    if job.get("payment_status") not in ("captured", "held", "authorized", "transferred", "released"):
        raise HTTPException(status_code=400, detail="No captured payment to refund for this job")

    intent = job.get("stripe_payment_intent_id")
    if intent and settings.stripe_secret_key:
        try:
            import stripe
            stripe.api_key = settings.stripe_secret_key
            stripe.Refund.create(payment_intent=intent)
        except Exception as e:  # noqa: BLE001 — surface Stripe failures cleanly
            raise HTTPException(status_code=400, detail=f"Refund failed: {e}")

    await db.job.update(where={"id": job_id}, data={"payment_status": "refunded"})
    await record_audit(db, event_type="billing.refunded", actor=admin,
                       target=job_id, details=f"Refunded job {job_id} (${job.get('total_price')})")
    return {"refunded": True, "job_id": job_id}


@router.get("/billing/subscriptions")
async def billing_subscriptions(
    plan: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    admin=Depends(get_admin_user),
    db=Depends(get_db),
):
    subs = await db.subscription.find_many() or []
    if plan:
        subs = [s for s in subs if (s.get("plan") or "free") == plan]
    if status:
        subs = [s for s in subs if (s.get("status") or "") == status]
    subs.sort(key=lambda s: str(s.get("created_at") or ""), reverse=True)
    total = len(subs)
    start = (page - 1) * limit
    rows = []
    for s in subs[start:start + limit]:
        rows.append({**s, "user": await _user_label(db, s.get("user_id"))})
    return {"subscriptions": rows, "total": total, "page": page, "limit": limit}


# ==================== SUPPORT QUEUE ====================

class TicketUpdateRequest(BaseModel):
    status: Optional[str] = None       # open, pending, resolved, closed
    assigned_to: Optional[str] = None
    priority: Optional[str] = None


class AdminReplyRequest(BaseModel):
    body: str


@router.get("/support/tickets")
async def admin_list_tickets(
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    admin=Depends(get_admin_user),
    db=Depends(get_db),
):
    tickets = await db.support_ticket.find_many() or []
    if status:
        tickets = [t for t in tickets if (t.get("status") or "open") == status]
    if q:
        n = q.strip().lower()
        tickets = [t for t in tickets
                   if n in (t.get("subject") or "").lower() or n in (t.get("email") or "").lower()]
    tickets.sort(key=lambda t: str(t.get("created_at") or ""), reverse=True)
    total = len(tickets)
    start = (page - 1) * limit
    rows = []
    for t in tickets[start:start + limit]:
        msgs = await db.support_message.find_many(where={"ticket_id": t["id"]}) or []
        rows.append({**t, "requester": await _user_label(db, t.get("user_id")),
                     "message_count": len(msgs)})
    # open-count helps badge the nav
    open_count = sum(1 for t in tickets if (t.get("status") or "open") in ("open", "pending"))
    return {"tickets": rows, "total": total, "open_count": open_count, "page": page, "limit": limit}


@router.get("/support/tickets/{ticket_id}")
async def admin_ticket_detail(ticket_id: str, admin=Depends(get_admin_user), db=Depends(get_db)):
    ticket = await db.support_ticket.find_unique(where={"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    msgs = await db.support_message.find_many(where={"ticket_id": ticket_id}) or []
    msgs.sort(key=lambda m: str(m.get("created_at") or ""))
    return {"ticket": {**ticket, "requester": await _user_label(db, ticket.get("user_id"))},
            "messages": msgs}


@router.post("/support/tickets/{ticket_id}/reply")
async def admin_reply_ticket(ticket_id: str, payload: AdminReplyRequest,
                             admin=Depends(get_admin_user), db=Depends(get_db)):
    ticket = await db.support_ticket.find_unique(where={"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    msg = await db.support_message.create(data={
        "ticket_id": ticket_id, "author_id": admin["id"], "author_role": "admin",
        "body": payload.body,
    })
    # An admin reply moves an open ticket to "pending" (awaiting requester).
    if (ticket.get("status") or "open") == "open":
        await db.support_ticket.update(where={"id": ticket_id}, data={"status": "pending"})
    await record_audit(db, event_type="support.replied", actor=admin,
                       target=ticket_id, details="Admin replied to ticket")
    return {"ok": True, "message": msg}


@router.patch("/support/tickets/{ticket_id}")
async def admin_update_ticket(ticket_id: str, payload: TicketUpdateRequest,
                              admin=Depends(get_admin_user), db=Depends(get_db)):
    ticket = await db.support_ticket.find_unique(where={"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    data = {}
    if payload.status is not None:
        if payload.status not in ("open", "pending", "resolved", "closed"):
            raise HTTPException(status_code=400, detail="Invalid status")
        data["status"] = payload.status
    if payload.priority is not None:
        if payload.priority not in ("low", "normal", "high", "urgent"):
            raise HTTPException(status_code=400, detail="Invalid priority")
        data["priority"] = payload.priority
    if payload.assigned_to is not None:
        data["assigned_to"] = payload.assigned_to or None
    if not data:
        raise HTTPException(status_code=400, detail="No updates provided")
    updated = await db.support_ticket.update(where={"id": ticket_id}, data=data)
    await record_audit(db, event_type="support.updated", actor=admin,
                       target=ticket_id, details=f"Ticket updated: {data}")
    return {"ok": True, "ticket": updated}


# ==================== TRAFFIC & GEOGRAPHY ====================

@router.get("/analytics/traffic")
async def analytics_traffic(range_: str = Query("30d", alias="range"),
                            admin=Depends(get_admin_user), db=Depends(get_db)):
    """Daily page views + unique visitors, plus top pages / referrers / countries."""
    days = _RANGE_DAYS.get(range_, 30)
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    views = await db.page_view.find_many() or []
    views = [v for v in views if (_dt(v.get("created_at")) or now) >= start]

    buckets = {}
    for i in range(days):
        d = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        buckets[d] = {"date": d, "views": 0, "visitors": set()}
    top_paths, top_ref, by_country = {}, {}, {}
    for v in views:
        dt = _dt(v.get("created_at"))
        key = dt.strftime("%Y-%m-%d") if dt else None
        if key in buckets:
            buckets[key]["views"] += 1
            if v.get("visitor_hash"):
                buckets[key]["visitors"].add(v["visitor_hash"])
        top_paths[v.get("path") or "/"] = top_paths.get(v.get("path") or "/", 0) + 1
        if v.get("referrer_host"):
            top_ref[v["referrer_host"]] = top_ref.get(v["referrer_host"], 0) + 1
        if v.get("country"):
            by_country[v["country"]] = by_country.get(v["country"], 0) + 1

    series = [{"date": b["date"], "views": b["views"], "visitors": len(b["visitors"])}
              for b in buckets.values()]

    def _top(d, n=10):
        return [{"key": k, "count": c} for k, c in sorted(d.items(), key=lambda x: -x[1])[:n]]

    return {
        "range": range_,
        "total_views": len(views),
        "unique_visitors": len({v.get("visitor_hash") for v in views if v.get("visitor_hash")}),
        "series": series,
        "top_paths": _top(top_paths),
        "top_referrers": _top(top_ref),
        "by_country": _top(by_country, 20),
    }


@router.get("/analytics/geography")
async def analytics_geography(range_: str = Query("90d", alias="range"),
                              admin=Depends(get_admin_user), db=Depends(get_db)):
    """Jobs + revenue broken down by US state (via the job's property), so you
    can see which parts of the country are active."""
    days = _RANGE_DAYS.get(range_, 90)
    start = datetime.now(timezone.utc) - timedelta(days=days)
    jobs = await db.job.find_many() or []

    # property_id -> state lookup (one pass)
    props = {p["id"]: p for p in (await db.properties.find_many() or [])}

    by_state = {}
    for j in jobs:
        created = _dt(j.get("created_at"))
        if not created or created < start:
            continue
        prop = props.get(j.get("property_id"))
        state = (prop.get("state") if prop else None) or "Unknown"
        row = by_state.setdefault(state, {"state": state, "jobs": 0, "revenue": 0.0})
        row["jobs"] += 1
        if j.get("status") == "completed":
            row["revenue"] += float(j.get("total_price") or 0)

    states = sorted(by_state.values(), key=lambda r: -r["revenue"])
    for r in states:
        r["revenue"] = round(r["revenue"], 2)
    return {"range": range_, "by_state": states}
