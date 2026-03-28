"""
WebSocket Handler for BookACleaner.ai
Real-time messaging using Socket.IO
"""
import socketio
from datetime import datetime, timezone
import logging
from typing import Dict, Optional

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Build WebSocket CORS allowed origins — match the REST CORS config
import os, json
_ws_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
]
if os.getenv("FRONTEND_URL"):
    _ws_origins.append(os.getenv("FRONTEND_URL"))
if os.getenv("CORS_ORIGINS"):
    try:
        _ws_origins.extend(json.loads(os.getenv("CORS_ORIGINS")))
    except json.JSONDecodeError:
        pass
if os.getenv("ENVIRONMENT") == "production":
    _ws_origins.extend([
        "https://bookacleaner.ai",
        "https://www.bookacleaner.ai",
        "https://app.bookacleaner.ai",
    ])

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=_ws_origins,
    logger=True,
    engineio_logger=False,
)

# Create ASGI app
socket_app = socketio.ASGIApp(sio)

# Connected users: sid -> user_id
connected_users: Dict[str, str] = {}
# User -> sids mapping for multiple connections
user_sessions: Dict[str, set] = {}


async def validate_token(token: str) -> Optional[dict]:
    """Validate JWT token and return user data"""
    if not token:
        return None
    
    try:
        from jose import jwt, JWTError
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if user_id:
            return {"id": user_id}
    except Exception as e:
        logger.error(f"Token validation failed: {e}")
    
    return None


@sio.event
async def connect(sid, environ, auth):
    """Handle new WebSocket connection"""
    logger.info(f"Client connecting: {sid}")
    
    # Get token from auth data
    token = auth.get("token") if auth else None
    
    if not token:
        logger.warning(f"Connection rejected - no token: {sid}")
        return False
    
    user = await validate_token(token)
    if not user:
        logger.warning(f"Connection rejected - invalid token: {sid}")
        return False
    
    user_id = user["id"]
    connected_users[sid] = user_id
    
    # Track user sessions
    if user_id not in user_sessions:
        user_sessions[user_id] = set()
    user_sessions[user_id].add(sid)
    
    # Join user's personal room
    await sio.enter_room(sid, f"user:{user_id}")
    
    logger.info(f"Client connected: {sid} (user: {user_id})")
    
    # Send connection confirmation
    await sio.emit("connected", {"user_id": user_id}, room=sid)
    
    return True


@sio.event
async def disconnect(sid):
    """Handle WebSocket disconnection"""
    user_id = connected_users.pop(sid, None)
    
    if user_id and user_id in user_sessions:
        user_sessions[user_id].discard(sid)
        if not user_sessions[user_id]:
            del user_sessions[user_id]
    
    logger.info(f"Client disconnected: {sid}")


@sio.event
async def join_conversation(sid, data):
    """Join a conversation room"""
    user_id = connected_users.get(sid)
    if not user_id:
        return
    
    conversation_id = data.get("conversation_id")
    if conversation_id:
        await sio.enter_room(sid, f"conversation:{conversation_id}")
        logger.info(f"User {user_id} joined conversation: {conversation_id}")


@sio.event
async def leave_conversation(sid, data):
    """Leave a conversation room"""
    conversation_id = data.get("conversation_id")
    if conversation_id:
        await sio.leave_room(sid, f"conversation:{conversation_id}")


@sio.event
async def send_message(sid, data):
    """Handle incoming message"""
    user_id = connected_users.get(sid)
    if not user_id:
        await sio.emit("error", {"message": "Not authenticated"}, room=sid)
        return
    
    conversation_id = data.get("conversation_id")
    content = data.get("content")
    
    if not conversation_id or not content:
        await sio.emit("error", {"message": "Missing conversation_id or content"}, room=sid)
        return
    
    # Create message in database
    from app.database import db
    
    try:
        message = await db.message.create(data={
            "conversation_id": conversation_id,
            "sender_id": user_id,
            "content": content,
        })
        
        # Update conversation last_message_at
        await db.conversation.update(
            where={"id": conversation_id},
            data={"last_message_at": datetime.now(timezone.utc)}
        )
        
        # Get sender info
        user = await db.user.find_unique(where={"id": user_id})
        
        # Broadcast to conversation room
        await sio.emit("new_message", {
            "id": message["id"],
            "conversation_id": conversation_id,
            "sender_id": user_id,
            "sender_name": user.get("full_name") if user else None,
            "content": content,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }, room=f"conversation:{conversation_id}")
        
        logger.info(f"Message sent: {message['id']}")
        
    except Exception as e:
        logger.error(f"Failed to send message: {e}")
        await sio.emit("error", {"message": "Failed to send message"}, room=sid)


@sio.event
async def typing(sid, data):
    """Handle typing indicator"""
    user_id = connected_users.get(sid)
    if not user_id:
        return
    
    conversation_id = data.get("conversation_id")
    is_typing = data.get("is_typing", True)
    
    if conversation_id:
        await sio.emit("user_typing", {
            "user_id": user_id,
            "conversation_id": conversation_id,
            "is_typing": is_typing,
        }, room=f"conversation:{conversation_id}", skip_sid=sid)


@sio.event
async def mark_read(sid, data):
    """Mark messages as read"""
    user_id = connected_users.get(sid)
    if not user_id:
        return
    
    conversation_id = data.get("conversation_id")
    message_id = data.get("message_id")
    
    if not conversation_id:
        return
    
    from app.database import db
    
    try:
        # Update message read status
        if message_id:
            await db.message.update(
                where={"id": message_id},
                data={"read_at": datetime.now(timezone.utc)}
            )
        
        # Emit read receipt to conversation
        await sio.emit("messages_read", {
            "user_id": user_id,
            "conversation_id": conversation_id,
            "message_id": message_id,
        }, room=f"conversation:{conversation_id}", skip_sid=sid)
        
    except Exception as e:
        logger.error(f"Failed to mark read: {e}")


# Utility functions for sending notifications from other parts of the app

async def send_to_user(user_id: str, event: str, data: dict):
    """Send event to all sessions of a user"""
    if user_id in user_sessions:
        for sid in user_sessions[user_id]:
            await sio.emit(event, data, room=sid)


async def broadcast_to_conversation(conversation_id: str, event: str, data: dict):
    """Broadcast event to all users in a conversation"""
    await sio.emit(event, data, room=f"conversation:{conversation_id}")


def is_user_online(user_id: str) -> bool:
    """Check if user is currently connected"""
    return user_id in user_sessions and len(user_sessions[user_id]) > 0
