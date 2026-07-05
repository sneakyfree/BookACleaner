"""
Route-contract guard test.

Parses every literal ``/api/v1/...`` path the frontend API client
(``apps/web/src/lib/api.ts``) calls, and asserts each one resolves to a
registered FastAPI route (matching both the path template AND the HTTP method).

This deterministically catches the path-drift class of bug that shipped here
(e.g. ``/notifications/mark-all-read`` vs the real ``/notifications/read-all``,
and ``/payments/create-intent`` vs ``/payments/create-payment-intent``).
"""
import re
from pathlib import Path

import pytest

from app.main import app

# apps/api/tests/ -> apps/api -> apps -> <repo root>
REPO_ROOT = Path(__file__).resolve().parents[3]
API_TS = REPO_ROOT / "apps" / "web" / "src" / "lib" / "api.ts"


def _normalize(path: str) -> str:
    """Strip query string, collapse any path param to a single placeholder,
    and drop a trailing slash so ``/x`` and ``/x/`` compare equal."""
    # Collapse complete JS template vars ${id} -> {}
    path = re.sub(r"\$\{[^}]*\}", "{}", path)
    # Drop an unterminated ${...  tail — these come from inline query-string
    # builders like `${qs ? `?..` : ''}` whose inner backtick truncates capture.
    path = re.sub(r"\$\{.*$", "", path)
    # Drop any remaining query string.
    path = path.split("?", 1)[0]
    # FastAPI/JS path params -> {}
    path = re.sub(r"\{[^}]*\}", "{}", path)
    if len(path) > 1:
        path = path.rstrip("/")
    return path


def _frontend_calls():
    """Yield (method, normalized_path, raw_path) for each this.request(...) call."""
    text = API_TS.read_text()
    # this.request<...>( <quote>PATH<quote>  [ , { ...options... } ] )
    pattern = re.compile(
        r"""this\.request<[^>]*>\(\s*
            (['"`])(/api/v1[^'"`]*)\1        # the path literal
            (?:\s*,\s*\{(?P<opts>[^}]*)\})?  # optional options object
        """,
        re.VERBOSE,
    )
    for m in pattern.finditer(text):
        raw = m.group(2)
        opts = m.group("opts") or ""
        mm = re.search(r"method:\s*['\"](\w+)['\"]", opts)
        method = (mm.group(1) if mm else "GET").upper()
        yield method, _normalize(raw), raw


def _registered_routes():
    routes = set()
    for r in app.routes:
        methods = getattr(r, "methods", None)
        path = getattr(r, "path", None)
        if not methods or not path:
            continue
        for meth in methods:
            routes.add((meth.upper(), _normalize(path)))
    return routes


# Pre-existing path-drift that PRE-DATES this PR and is OUT OF SCOPE for the
# nav/api-drift fix branch (fixing each needs a product decision about the right
# target endpoint). Documented here so the guard stays green while still failing
# on any *new* drift or a regression of the paths this PR fixed
# (notifications/read-all, payments/create-payment-intent).
# TODO(grant): resolve these — frontend calls a route the backend never exposes.
KNOWN_UNMATCHED = {
    ("GET", "/api/v1/agreements"),            # backend only has /agreements/my, /templates
    ("POST", "/api/v1/agreements/accept"),    # backend agreements has no /accept
    ("GET", "/api/v1/sponsored"),             # backend: /sponsored/active | /my-listing
    ("POST", "/api/v1/sponsored"),            # backend: /sponsored/create
    ("PATCH", "/api/v1/auth/settings"),       # no such backend route
    ("GET", "/api/v1/schedule/gaps"),         # backend prefix is /route/gaps
    ("POST", "/api/v1/properties/{}/sync-ical"),  # no such backend route
}


def test_api_ts_exists():
    assert API_TS.exists(), f"frontend api client not found at {API_TS}"


def test_every_frontend_path_has_a_backend_route():
    registered = _registered_routes()
    calls = list(_frontend_calls())
    assert calls, "parsed zero /api/v1 calls from api.ts — parser is broken"

    missing = []
    for method, norm, raw in calls:
        if (method, norm) not in registered and (method, norm) not in KNOWN_UNMATCHED:
            missing.append(f"{method} {raw}  (normalized: {method} {norm})")

    assert not missing, (
        "Frontend calls paths with no matching FastAPI route (path drift). "
        "If this is a NEW mismatch, fix the path; do not add to KNOWN_UNMATCHED "
        "without a product decision:\n  - "
        + "\n  - ".join(sorted(set(missing)))
    )
