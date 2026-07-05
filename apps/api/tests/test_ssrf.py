"""SSRF guard for user-supplied calendar URLs (app.services.ical)."""
import pytest

from app.services.ical import _assert_public_http_url


@pytest.mark.asyncio
@pytest.mark.parametrize("url", [
    "http://127.0.0.1:18000/openapi.json",      # loopback
    "http://169.254.169.254/latest/meta-data/", # cloud metadata
    "http://10.10.0.1/",                          # private (WireGuard mesh)
    "http://192.168.1.1/",                        # private
    "http://[::1]/",                              # ipv6 loopback
    "file:///etc/passwd",                         # non-http scheme
    "ftp://example.com/cal.ics",                  # non-http scheme
    "not-a-url",                                  # garbage
])
async def test_internal_and_bad_urls_blocked(url):
    with pytest.raises(ValueError):
        await _assert_public_http_url(url)


@pytest.mark.asyncio
@pytest.mark.parametrize("url", [
    "https://example.com/calendar.ics",
    "http://example.com/cal.ics",
])
async def test_public_urls_allowed(url):
    # Resolves to a public address → no exception.
    await _assert_public_http_url(url)
