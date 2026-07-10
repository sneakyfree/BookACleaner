"""
Messaging API for BookACleaner.ai
Handles conversations and messages between clients and cleaners
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel
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
    content: str
    job_id: Optional[str] = None
    attachments: List[str] = []


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

    conversations = await db.conversation.find_many()

    # Filter to user's conversations and enrich with data
    user_conversations = []

    for conv in conversations:
        # Only include conversations the caller is actually a participant in —
        # otherwise the list leaks every conversation's last-message content.
        if not await is_conversation_participant(db, conv["id"], user["id"]):
            continue

        # Get last message
        messages = await db.message.find_many(where={"conversation_id": conv["id"]})
        last_message = messages[-1] if messages else None
        
        # Count unread
        unread_count = sum(1 for m in messages if not m.get("read_at") and m.get("sender_id") != user["id"])
        
        # Get other participant
        other_user = None
        # In production, query ConversationParticipant table
        
        user_conversations.append({
            "id": conv["id"],
            "job_id": conv.get("job_id"),
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
