"""
User-facing help-desk: create a support ticket and follow its thread. The admin
side of the queue lives in admin_ops.py.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import logging

from app.database import get_db
from app.api.deps import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

_CATEGORIES = ("general", "billing", "account", "technical", "other")


class CreateTicketRequest(BaseModel):
    subject: str = Field(min_length=3, max_length=255)
    message: str = Field(min_length=1, max_length=5000)
    category: str = "general"
    email: Optional[EmailStr] = None  # defaults to the account email


class ReplyRequest(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


@router.post("/tickets")
async def create_ticket(data: CreateTicketRequest, user=Depends(get_current_user), db=Depends(get_db)):
    """Open a support ticket. Seeds the thread with the first message."""
    category = data.category if data.category in _CATEGORIES else "general"
    email = data.email or user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="An email is required")

    ticket = await db.support_ticket.create(data={
        "user_id": user["id"], "email": email, "subject": data.subject,
        "category": category, "status": "open", "priority": "normal",
    })
    await db.support_message.create(data={
        "ticket_id": ticket["id"], "author_id": user["id"],
        "author_role": user.get("role"), "body": data.message,
    })
    return {"ok": True, "ticket": ticket}


@router.get("/tickets")
async def list_my_tickets(
    status: Optional[str] = Query(None),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    tickets = await db.support_ticket.find_many(where={"user_id": user["id"]}) or []
    if status:
        tickets = [t for t in tickets if (t.get("status") or "open") == status]
    tickets.sort(key=lambda t: str(t.get("updated_at") or t.get("created_at") or ""), reverse=True)
    return {"tickets": tickets, "total": len(tickets)}


@router.get("/tickets/{ticket_id}")
async def get_my_ticket(ticket_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    ticket = await db.support_ticket.find_unique(where={"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.get("user_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    msgs = await db.support_message.find_many(where={"ticket_id": ticket_id}) or []
    msgs.sort(key=lambda m: str(m.get("created_at") or ""))
    return {"ticket": ticket, "messages": msgs}


@router.post("/tickets/{ticket_id}/reply")
async def reply_to_ticket(ticket_id: str, data: ReplyRequest,
                          user=Depends(get_current_user), db=Depends(get_db)):
    ticket = await db.support_ticket.find_unique(where={"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.get("user_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    msg = await db.support_message.create(data={
        "ticket_id": ticket_id, "author_id": user["id"],
        "author_role": user.get("role"), "body": data.body,
    })
    # A requester reply re-opens a pending/resolved ticket.
    if (ticket.get("status") or "open") in ("pending", "resolved") and ticket.get("user_id") == user["id"]:
        await db.support_ticket.update(where={"id": ticket_id}, data={"status": "open"})
    return {"ok": True, "message": msg}
