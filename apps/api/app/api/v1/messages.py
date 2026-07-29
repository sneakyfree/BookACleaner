"""
Messaging API for BookACleaner.ai
Handles conversations and messages between clients and cleaners
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime, timezone
import logging

from app.database import get_db
from app.config import get_settings
from app.api.deps import get_current_user

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


# ==================== SCHEMAS ====================

class SendMessageRequest(BaseModel):
    conversation_id: Optional[str] = None
    # Optional: only needed to open a new conversation. Messages sent into an
    # existing conversation_id don't carry it — required-but-unused here 422'd
    # every in-conversation send.
    recipient_id: Optional[str] = None
    # Non-empty after trimming: blank/whitespace-only sends previously created
    # a real message row and returned 200.
    content: str = Field(min_length=1)
    job_id: Optional[str] = None
    attachments: List[str] = []

    @field_validator("content")
    @classmethod
    def _content_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("content must not be empty")
        return v


class CreateConversationRequest(BaseModel):
    recipient_id: str
    job_id: Optional[str] = None
    initial_message: Optional[str] = None


# ==================== AUTH HELPER ====================
@router.get("/conversations")
async def list_conversations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """List conversations the current user participates in."""

    # Start from the caller's OWN participation instead of the whole table.
    #
    # This previously loaded every conversation on the platform and then ran
    # ~5 queries against each one (participant check, messages, participants
    # again, the other user) just to discard the ones the caller isn't in — so
    # a user with two threads paid for every thread in the system. Everything
    # below is now scoped to the caller and batched: a constant number of
    # queries regardless of how large the tables get.
    my_parts = await db.conversation_participant.find_many(where={"user_id": user["id"]})
    my_conv_ids = {p["conversation_id"] for p in my_parts if p.get("conversation_id")}

    # Legacy threads predate the participants table; membership there is
    # implied by having sent a message. Preserved from is_conversation_participant.
    my_messages = await db.message.find_many(where={"sender_id": user["id"]})
    my_conv_ids |= {m["conversation_id"] for m in my_messages if m.get("conversation_id")}

    if not my_conv_ids:
        return []

    conv_ids = list(my_conv_ids)
    conversations = await db.conversation.find_many(where={"id": conv_ids})
    all_messages = await db.message.find_many(where={"conversation_id": conv_ids})
    all_parts = await db.conversation_participant.find_many(
        where={"conversation_id": conv_ids}
    )

    messages_by_conv: dict = {}
    for m in all_messages:
        messages_by_conv.setdefault(m.get("conversation_id"), []).append(m)
    parts_by_conv: dict = {}
    for p in all_parts:
        parts_by_conv.setdefault(p.get("conversation_id"), []).append(p)

    # Resolve every "other participant" in one query rather than one per thread.
    other_id_by_conv: dict = {}
    for conv in conversations:
        msgs = messages_by_conv.get(conv["id"], [])
        candidates = [
            p.get("user_id")
            for p in parts_by_conv.get(conv["id"], [])
            if p.get("user_id") != user["id"]
        ]
        if not candidates:
            candidates = [
                m.get("sender_id") for m in msgs if m.get("sender_id") != user["id"]
            ]
        if candidates:
            other_id_by_conv[conv["id"]] = candidates[0]

    users_by_id: dict = {}
    if other_id_by_conv:
        for u in await db.user.find_many(where={"id": list(set(other_id_by_conv.values()))}):
            users_by_id[u.get("id")] = u

    user_conversations = []
    for conv in conversations:
        messages = messages_by_conv.get(conv["id"], [])
        last_message = messages[-1] if messages else None
        unread_count = sum(
            1
            for m in messages
            if not m.get("read_at") and m.get("sender_id") != user["id"]
        )
        other_user = users_by_id.get(other_id_by_conv.get(conv["id"]))

        user_conversations.append({
            "id": conv["id"],
            "job_id": conv.get("job_id"),
            "other_participant": {
                "id": other_user["id"],
                "name": other_user.get("full_name") or other_user.get("email"),
                "avatar_url": other_user.get("avatar_url"),
            } if other_user else None,
            "last_message": {
                "content": last_message.get("content") if last_message else None,
                "sent_at": last_message.get("created_at") if last_message else None,
                "sender_id": last_message.get("sender_id") if last_message else None,
            } if last_message else None,
            "unread_count": unread_count,
            "updated_at": conv.get("last_message_at") or conv.get("created_at"),
        })
    
    # Sort by last message time
    user_conversations.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
    
    return user_conversations


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get conversation with messages"""
    
    conv = await db.conversation.find_unique(where={"id": conversation_id})

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Object-level authz: only participants may read the thread (was an IDOR
    # leaking other users' private messages).
    if not await is_conversation_participant(db, conversation_id, user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get messages
    messages = await db.message.find_many(where={"conversation_id": conversation_id})
    
    # Enrich messages with sender info
    enriched_messages = []
    for msg in messages:
        sender = await db.user.find_unique(where={"id": msg["sender_id"]})
        enriched_messages.append({
            "id": msg["id"],
            "content": msg["content"],
            "attachments": msg.get("attachments", []),
            "created_at": msg.get("created_at"),
            "read_at": msg.get("read_at"),
            "sender": {
                "id": sender["id"] if sender else None,
                "name": sender.get("full_name") if sender else None,
                "avatar": sender.get("avatar_url") if sender else None,
            } if sender else None,
            "is_mine": msg["sender_id"] == user["id"],
        })
    
    return {
        "id": conv["id"],
        "job_id": conv.get("job_id"),
        "created_at": conv.get("created_at"),
        "messages": enriched_messages,
    }


async def is_conversation_participant(db, conversation_id: str, user_id: str) -> bool:
    """A user is a participant if they're recorded in conversation_participants
    or have sent a message in the conversation (covers pre-existing threads
    created before participants were tracked)."""
    parts = await db.conversation_participant.find_many(where={"conversation_id": conversation_id})
    if any(p.get("user_id") == user_id for p in parts):
        return True
    msgs = await db.message.find_many(where={"conversation_id": conversation_id})
    return any(m.get("sender_id") == user_id for m in msgs)


@router.post("/conversations")
async def create_conversation(
    data: CreateConversationRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create a new conversation"""

    # Check if recipient exists
    recipient = await db.user.find_unique(where={"id": data.recipient_id})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    # Create conversation
    conv = await db.conversation.create(data={
        "job_id": data.job_id,
        "last_message_at": datetime.now(timezone.utc),
    })

    # Record both parties so conversation access can be authorized.
    for member_id in {user["id"], data.recipient_id}:
        await db.conversation_participant.create(data={
            "conversation_id": conv["id"],
            "user_id": member_id,
        })

    # If initial message provided, create it
    if data.initial_message:
        await db.message.create(data={
            "conversation_id": conv["id"],
            "sender_id": user["id"],
            "content": data.initial_message,
            "job_id": data.job_id,
        })
    
    return {
        "id": conv["id"],
        "job_id": conv.get("job_id"),
        "created_at": conv.get("created_at"),
    }


@router.post("/send")
async def send_message(
    data: SendMessageRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Send a message"""
    
    conversation_id = data.conversation_id

    if conversation_id:
        # Sending into an existing conversation — must be a participant
        # (otherwise anyone could inject messages into others' threads).
        conv = await db.conversation.find_unique(where={"id": conversation_id})
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if not await is_conversation_participant(db, conversation_id, user["id"]):
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        # No conversation id: open a new thread (previously this grabbed the
        # first conversation in the whole table — sending into a stranger's
        # thread). Record the sender (and recipient if supplied) as participants.
        conv = await db.conversation.create(data={
            "job_id": data.job_id,
            "last_message_at": datetime.now(timezone.utc),
        })
        conversation_id = conv["id"]
        member_ids = {user["id"]}
        if data.recipient_id:
            # Validate the recipient exists before recording them as a
            # participant — user_id is a FK to users.id. Unvalidated, a bogus
            # id silently created a dangling participant row on SQLite and
            # raised a 500 FK violation on PostgreSQL. Mirrors the same check
            # in create_conversation above.
            recipient = await db.user.find_unique(where={"id": data.recipient_id})
            if not recipient:
                raise HTTPException(status_code=404, detail="Recipient not found")
            member_ids.add(data.recipient_id)
        for member_id in member_ids:
            await db.conversation_participant.create(data={
                "conversation_id": conversation_id,
                "user_id": member_id,
            })

    # Create message
    message = await db.message.create(data={
        "conversation_id": conversation_id,
        "sender_id": user["id"],
        "content": data.content,
        "job_id": data.job_id,
        "attachments": data.attachments,
    })
    
    # Update conversation last_message_at
    await db.conversation.update(
        where={"id": conversation_id},
        data={"last_message_at": datetime.now(timezone.utc)}
    )
    
    return {
        "id": message["id"],
        "conversation_id": conversation_id,
        "content": message["content"],
        "created_at": message.get("created_at"),
    }


@router.post("/conversations/{conversation_id}/read")
async def mark_as_read(
    conversation_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Mark all messages in conversation as read"""
    
    # Get all unread messages not sent by user
    messages = await db.message.find_many(where={"conversation_id": conversation_id})
    
    updated_count = 0
    for msg in messages:
        if msg.get("sender_id") != user["id"] and not msg.get("read_at"):
            await db.message.update(
                where={"id": msg["id"]},
                data={"read_at": datetime.now(timezone.utc)}
            )
            updated_count += 1
    
    return {"marked_read": updated_count}


@router.get("/unread-count")
async def get_unread_count(
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get total unread message count for user"""
    
    messages = await db.message.find_many()
    
    unread = sum(1 for m in messages if not m.get("read_at") and m.get("sender_id") != user["id"])
    
    return {"unread_count": unread}
