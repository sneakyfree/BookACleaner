"""
WebSocket Connection Manager for BookACleaner.ai
Handles real-time messaging, job updates, and notifications
"""
import asyncio
import json
from datetime import datetime, timezone
from typing import Dict, Set, Optional, Any, List
from fastapi import WebSocket, WebSocketDisconnect
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time features:
    - User connections (authenticated users)
    - Room-based messaging (conversations)
    - Job status broadcasts
    - Notification streams
    """
    
    def __init__(self):
        # User ID -> Set of WebSocket connections (supports multiple tabs/devices)
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        
        # Conversation/Room ID -> Set of WebSocket connections
        self.rooms: Dict[str, Set[WebSocket]] = {}
        
        # WebSocket -> User ID mapping (for cleanup)
        self.connection_users: Dict[WebSocket, str] = {}
        
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept a new WebSocket connection and register the user"""
        await websocket.accept()
        
        async with self._lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            
            self.active_connections[user_id].add(websocket)
            self.connection_users[websocket] = user_id
        
        logger.info(f"User {user_id} connected. Total connections: {len(self.connection_users)}")
        
        # Send connection confirmation
        await self.send_personal_message({
            "type": "connection",
            "status": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, websocket)
    
    async def disconnect(self, websocket: WebSocket):
        """Handle WebSocket disconnection"""
        async with self._lock:
            user_id = self.connection_users.pop(websocket, None)
            
            if user_id and user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            # Remove from all rooms
            for room_id in list(self.rooms.keys()):
                self.rooms[room_id].discard(websocket)
                if not self.rooms[room_id]:
                    del self.rooms[room_id]
        
        logger.info(f"User {user_id} disconnected. Total connections: {len(self.connection_users)}")
    
    async def join_room(self, websocket: WebSocket, room_id: str):
        """Add a user to a conversation/room"""
        async with self._lock:
            if room_id not in self.rooms:
                self.rooms[room_id] = set()
            self.rooms[room_id].add(websocket)
        
        logger.debug(f"WebSocket joined room {room_id}")
    
    async def leave_room(self, websocket: WebSocket, room_id: str):
        """Remove a user from a conversation/room"""
        async with self._lock:
            if room_id in self.rooms:
                self.rooms[room_id].discard(websocket)
                if not self.rooms[room_id]:
                    del self.rooms[room_id]
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send a message to all connections of a specific user"""
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send to user {user_id}: {e}")
                    disconnected.append(connection)
            
            # Clean up failed connections
            for conn in disconnected:
                await self.disconnect(conn)
    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude: Optional[WebSocket] = None):
        """Broadcast a message to all users in a room"""
        if room_id not in self.rooms:
            return
        
        disconnected = []
        for connection in self.rooms[room_id]:
            if connection != exclude:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to broadcast to room {room_id}: {e}")
                    disconnected.append(connection)
        
        # Clean up failed connections
        for conn in disconnected:
            await self.disconnect(conn)
    
    async def broadcast_to_users(self, user_ids: List[str], message: dict):
        """Broadcast a message to multiple specific users"""
        for user_id in user_ids:
            await self.send_to_user(user_id, message)
    
    def get_online_users(self) -> List[str]:
        """Get list of currently online user IDs"""
        return list(self.active_connections.keys())
    
    def is_user_online(self, user_id: str) -> bool:
        """Check if a user is currently online"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


# Singleton instance
manager = ConnectionManager()


# ==================== MESSAGE TYPES ====================

class WSMessageTypes:
    """WebSocket message type constants"""
    
    # Connection
    CONNECTION = "connection"
    PING = "ping"
    PONG = "pong"
    
    # Chat
    CHAT_MESSAGE = "chat_message"
    CHAT_TYPING = "chat_typing"
    CHAT_READ = "chat_read"
    
    # Jobs
    JOB_UPDATE = "job_update"
    JOB_ACCEPTED = "job_accepted"
    JOB_DECLINED = "job_declined"
    JOB_STARTED = "job_started"
    JOB_COMPLETED = "job_completed"
    JOB_CANCELLED = "job_cancelled"
    
    # Notifications
    NOTIFICATION = "notification"
    
    # Rooms
    JOIN_ROOM = "join_room"
    LEAVE_ROOM = "leave_room"


def create_message(msg_type: str, data: Any, **kwargs) -> dict:
    """Helper to create a standardized WebSocket message"""
    return {
        "type": msg_type,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **kwargs
    }
