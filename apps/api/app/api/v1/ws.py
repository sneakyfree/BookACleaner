"""
WebSocket API Endpoints for BookACleaner.ai
Real-time messaging, job updates, and notification streaming
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Optional
import json
import logging

from app.services.websocket import manager, WSMessageTypes, create_message

router = APIRouter()
logger = logging.getLogger(__name__)


async def get_user_from_token(token: str) -> Optional[str]:
    """
    Validate WebSocket token and return user_id.
    Decodes JWT using the same secret/algorithm as the REST API.
    Returns None for missing, invalid, or expired tokens.
    """
    from jose import jwt, JWTError
    from app.config import get_settings

    if not token:
        return None

    settings = get_settings()
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        user_id = payload.get("sub")
        return user_id  # None if 'sub' claim is absent
    except (JWTError, Exception):
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """
    Main WebSocket endpoint for real-time features
    
    Connect with: ws://localhost:8000/api/v1/ws?token=<jwt_token>
    
    Supported message types:
    - ping: Keep connection alive
    - join_room: Join a conversation room
    - leave_room: Leave a conversation room
    - chat_message: Send a chat message
    - chat_typing: Typing indicator
    - chat_read: Mark messages as read
    """
    # Authenticate user
    user_id = await get_user_from_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    
    # Connect user
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            # Receive and parse message
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                payload = message.get("data", {})
                
                await handle_message(websocket, user_id, msg_type, payload)
                
            except json.JSONDecodeError:
                await manager.send_personal_message(
                    create_message("error", {"message": "Invalid JSON"}),
                    websocket
                )
    
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        await manager.disconnect(websocket)


async def handle_message(websocket: WebSocket, user_id: str, msg_type: str, payload: dict):
    """Route incoming WebSocket messages to appropriate handlers"""
    
    handlers = {
        WSMessageTypes.PING: handle_ping,
        WSMessageTypes.JOIN_ROOM: handle_join_room,
        WSMessageTypes.LEAVE_ROOM: handle_leave_room,
        WSMessageTypes.CHAT_MESSAGE: handle_chat_message,
        WSMessageTypes.CHAT_TYPING: handle_chat_typing,
        WSMessageTypes.CHAT_READ: handle_chat_read,
    }
    
    handler = handlers.get(msg_type)
    if handler:
        await handler(websocket, user_id, payload)
    else:
        await manager.send_personal_message(
            create_message("error", {"message": f"Unknown message type: {msg_type}"}),
            websocket
        )


# ==================== MESSAGE HANDLERS ====================

async def handle_ping(websocket: WebSocket, user_id: str, payload: dict):
    """Respond to ping with pong"""
    await manager.send_personal_message(
        create_message(WSMessageTypes.PONG, {}),
        websocket
    )


async def handle_join_room(websocket: WebSocket, user_id: str, payload: dict):
    """Join a conversation room"""
    room_id = payload.get("room_id")
    if not room_id:
        await manager.send_personal_message(
            create_message("error", {"message": "room_id required"}),
            websocket
        )
        return
    
    await manager.join_room(websocket, room_id)
    await manager.send_personal_message(
        create_message("room_joined", {"room_id": room_id}),
        websocket
    )


async def handle_leave_room(websocket: WebSocket, user_id: str, payload: dict):
    """Leave a conversation room"""
    room_id = payload.get("room_id")
    if room_id:
        await manager.leave_room(websocket, room_id)
        await manager.send_personal_message(
            create_message("room_left", {"room_id": room_id}),
            websocket
        )


async def handle_chat_message(websocket: WebSocket, user_id: str, payload: dict):
    """Handle outgoing chat message"""
    room_id = payload.get("room_id")
    content = payload.get("content")
    
    if not room_id or not content:
        await manager.send_personal_message(
            create_message("error", {"message": "room_id and content required"}),
            websocket
        )
        return
    
    # Create the message payload
    message_data = {
        "room_id": room_id,
        "sender_id": user_id,
        "content": content,
        "message_id": payload.get("message_id"),  # Client-generated for optimistic UI
    }
    
    # Broadcast to room (excluding sender - they have optimistic UI)
    await manager.broadcast_to_room(
        room_id,
        create_message(WSMessageTypes.CHAT_MESSAGE, message_data),
        exclude=websocket
    )
    
    # Confirm to sender
    await manager.send_personal_message(
        create_message("message_sent", {"message_id": message_data["message_id"]}),
        websocket
    )


async def handle_chat_typing(websocket: WebSocket, user_id: str, payload: dict):
    """Broadcast typing indicator to room"""
    room_id = payload.get("room_id")
    is_typing = payload.get("is_typing", True)
    
    if room_id:
        await manager.broadcast_to_room(
            room_id,
            create_message(WSMessageTypes.CHAT_TYPING, {
                "room_id": room_id,
                "user_id": user_id,
                "is_typing": is_typing
            }),
            exclude=websocket
        )


async def handle_chat_read(websocket: WebSocket, user_id: str, payload: dict):
    """Broadcast read receipt to room"""
    room_id = payload.get("room_id")
    last_read_id = payload.get("last_read_id")
    
    if room_id and last_read_id:
        await manager.broadcast_to_room(
            room_id,
            create_message(WSMessageTypes.CHAT_READ, {
                "room_id": room_id,
                "user_id": user_id,
                "last_read_id": last_read_id
            }),
            exclude=websocket
        )


# ==================== UTILITY FUNCTIONS FOR EXTERNAL USE ====================

async def notify_job_update(job_id: str, user_ids: list, status: str, details: dict = None):
    """Notify users about a job status update"""
    message = create_message(WSMessageTypes.JOB_UPDATE, {
        "job_id": job_id,
        "status": status,
        "details": details or {}
    })
    await manager.broadcast_to_users(user_ids, message)


async def send_notification(user_id: str, notification: dict):
    """Send a notification to a specific user"""
    message = create_message(WSMessageTypes.NOTIFICATION, notification)
    await manager.send_to_user(user_id, message)


async def broadcast_message_to_conversation(conversation_id: str, message_data: dict):
    """Send a new message to all participants in a conversation"""
    message = create_message(WSMessageTypes.CHAT_MESSAGE, message_data)
    await manager.broadcast_to_room(conversation_id, message)
