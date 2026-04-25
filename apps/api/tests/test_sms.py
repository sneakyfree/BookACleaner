"""
SMS and OTP tests for BookACleaner.ai — Strand B.

Covers: SMSService dev-mode logging, OTP message format, booking confirmation,
and end-to-end OTP auth flow.
"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient
from tests.conftest import get_auth_header


# ==================== SMSService Unit Tests ====================


@pytest.mark.asyncio
async def test_sms_dev_mode_logs_message():
    """In dev mode (no real Twilio creds), send_sms should succeed without errors."""
    from app.services.sms import SMSService

    service = SMSService()
    result = await service.send_sms("+15551234567", "Test message")
    assert result["success"] is True


@pytest.mark.asyncio
async def test_send_otp_formats_correctly():
    """send_otp should include the code in the message."""
    from app.services.sms import SMSService

    service = SMSService()
    with patch.object(service, "send_sms", new_callable=AsyncMock, return_value={"success": True}) as mock:
        await service.send_otp("+15551234567", "123456")
        mock.assert_called_once()
        msg = mock.call_args[0][1]
        assert "123456" in msg
        assert "BookACleaner" in msg
        assert "10 minutes" in msg


@pytest.mark.asyncio
async def test_send_booking_confirmation_formats():
    """send_booking_confirmation should include cleaner name, date, time, address."""
    from app.services.sms import SMSService

    service = SMSService()
    with patch.object(service, "send_sms", new_callable=AsyncMock, return_value={"success": True}) as mock:
        await service.send_booking_confirmation(
            to="+15551234567",
            cleaner_name="Jane Doe",
            date="2026-05-01",
            time="10:00 AM",
            address="123 Main St"
        )
        mock.assert_called_once()
        msg = mock.call_args[0][1]
        assert "Jane Doe" in msg
        assert "2026-05-01" in msg
        assert "10:00 AM" in msg
        assert "123 Main St" in msg


@pytest.mark.asyncio
async def test_send_verification_code_alias():
    """send_verification_code should delegate to send_otp."""
    from app.services.sms import SMSService

    service = SMSService()
    with patch.object(service, "send_otp", new_callable=AsyncMock, return_value={"success": True}) as mock:
        await service.send_verification_code("+15551234567", "654321")
        mock.assert_called_once_with("+15551234567", "654321")


# ==================== OTP Auth Flow Tests ====================


@pytest.mark.asyncio
async def test_otp_send_endpoint(client: AsyncClient):
    """POST /auth/otp/send should accept a phone number and return success."""
    resp = await client.post(
        "/api/v1/auth/otp/send",
        json={"phone": "+15551234567"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["message"] == "OTP sent"
    assert data["expires_in"] == 600


@pytest.mark.asyncio
async def test_otp_verify_bad_code(client: AsyncClient):
    """POST /auth/otp/verify with wrong code should fail."""
    # First send an OTP
    await client.post("/api/v1/auth/otp/send", json={"phone": "+15559999999"})

    # Try to verify with wrong code
    resp = await client.post(
        "/api/v1/auth/otp/verify",
        json={"phone": "+15559999999", "code": "000000"},
    )
    assert resp.status_code == 400
    assert "Invalid" in resp.json().get("detail", "")


@pytest.mark.asyncio
async def test_otp_verify_no_request(client: AsyncClient):
    """POST /auth/otp/verify without prior send should fail."""
    resp = await client.post(
        "/api/v1/auth/otp/verify",
        json={"phone": "+15550000001", "code": "123456"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_otp_send_short_phone_rejected(client: AsyncClient):
    """Short phone number should be rejected by validation."""
    resp = await client.post(
        "/api/v1/auth/otp/send",
        json={"phone": "123"},
    )
    assert resp.status_code == 422  # Pydantic validation error
