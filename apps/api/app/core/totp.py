"""Dependency-free TOTP (RFC 6238) for admin MFA.

Kept self-contained (stdlib only) so enabling admin MFA doesn't add a runtime
dependency. Compatible with Google Authenticator / Authy / 1Password.
"""
import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote

_DIGITS = 6
_PERIOD = 30


def generate_secret() -> str:
    """Return a new base32 TOTP secret (160-bit)."""
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def _hotp(secret_b32: str, counter: int) -> str:
    # Pad base32 to a valid length before decoding.
    padded = secret_b32 + "=" * ((8 - len(secret_b32) % 8) % 8)
    key = base64.b32decode(padded, casefold=True)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF) % (10 ** _DIGITS)
    return str(code).zfill(_DIGITS)


def now_code(secret_b32: str, at: float | None = None) -> str:
    counter = int((at if at is not None else time.time()) // _PERIOD)
    return _hotp(secret_b32, counter)


def verify(secret_b32: str | None, code: str | None, window: int = 1) -> bool:
    """Verify a code against the secret, tolerating +/- `window` periods of clock skew."""
    if not secret_b32 or not code:
        return False
    code = str(code).strip().replace(" ", "")
    if len(code) != _DIGITS or not code.isdigit():
        return False
    counter = int(time.time() // _PERIOD)
    for drift in range(-window, window + 1):
        if hmac.compare_digest(_hotp(secret_b32, counter + drift), code):
            return True
    return False


def provisioning_uri(secret_b32: str, account_name: str, issuer: str = "BookACleaner") -> str:
    """otpauth:// URI for QR-code enrollment in an authenticator app."""
    label = quote(f"{issuer}:{account_name}")
    return (
        f"otpauth://totp/{label}?secret={secret_b32}"
        f"&issuer={quote(issuer)}&algorithm=SHA1&digits={_DIGITS}&period={_PERIOD}"
    )
