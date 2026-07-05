"""
Regression tests for witch-hunt Sprint 2 (2026-07-05).

The native WebSocket router (app/api/v1/ws.py) existed but was never mounted,
so the frontend's `ws://…/api/v1/ws?token=…` connection failed on every
messages page and live updates were silently dead. These tests self-mint a JWT
(no DB dependency) and drive the real handshake + message loop.
"""
import pytest
from jose import jwt
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.main import app
from app.config import get_settings


def _mint_token(sub: str = "user-client-1") -> str:
    s = get_settings()
    return jwt.encode({"sub": sub}, s.jwt_secret, algorithm=s.jwt_algorithm)


def test_ws_mounted_and_ping_pong():
    """Valid token → handshake accepted, ping answered. Fails with 403 on the
    handshake if the router is not mounted at /api/v1/ws."""
    client = TestClient(app)
    with client.websocket_connect(f"/api/v1/ws?token={_mint_token()}") as ws:
        hello = ws.receive_json()  # server greets with a connection frame
        assert hello.get("type") == "connection", f"expected welcome frame, got {hello}"
        assert hello.get("status") == "connected"
        ws.send_json({"type": "ping", "data": {}})
        reply = ws.receive_json()
        assert reply.get("type") == "pong", f"expected pong, got {reply}"


def test_ws_rejects_bad_token():
    """Garbage token → server closes with 4001 Unauthorized (never accepts)."""
    client = TestClient(app)
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/api/v1/ws?token=not-a-jwt") as ws:
            ws.receive_json()
    assert exc_info.value.code == 4001
