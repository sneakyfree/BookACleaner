"""AI service.

30% covered, and it is the feature the product is named for. The risk here is
not that GPT-4o gives a wrong answer — it is that a third-party outage, a rate
limit, or one malformed response takes down a booking flow, or that an
unauthenticated caller runs up the OpenAI bill.

Every test stubs the OpenAI client. Nothing here may make a real API call.
"""
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.services.ai import AIService


def completion(content: str):
    """Shape of an OpenAI chat completion response."""
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
    )


def service_with(response=None, error=None):
    """An AIService whose OpenAI client is stubbed."""
    svc = AIService()
    create = AsyncMock()
    if error is not None:
        create.side_effect = error
    else:
        create.return_value = response
    svc.client = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=create))
    )
    return svc, create


# ── the endpoints are not an open bill ────────────────────────────────────


@pytest.mark.parametrize(
    "path,payload",
    [
        ("/api/v1/ai/chat", {"message": "hi"}),
        ("/api/v1/ai/parse-document", {"image_url": "http://x/y.png", "document_type": "id"}),
        ("/api/v1/ai/verify-document", {"image_url": "http://x/y.png", "document_type": "id"}),
        ("/api/v1/ai/estimate", {"property_details": {}, "services_requested": []}),
        ("/api/v1/ai/detect-property", {"address": "1 Test St"}),
        ("/api/v1/ai/job-summary", {"job_details": {}}),
    ],
)
@pytest.mark.asyncio
async def test_ai_endpoints_reject_anonymous_callers(client, path, payload):
    """Every AI route spends money per call and must require a session."""
    resp = await client.post(path, json=payload)
    assert resp.status_code in (401, 403), (
        f"{path} answered {resp.status_code} without auth — that is an open "
        "door to the OpenAI bill"
    )


# ── outages are contained, not propagated ─────────────────────────────────


@pytest.mark.asyncio
async def test_estimate_survives_openai_outage():
    """A provider outage must degrade, not raise into the request handler."""
    svc, _ = service_with(error=RuntimeError("openai is down"))
    result = await svc.generate_cleaning_estimate({"sqft": 1800}, ["standard"])
    assert result["success"] is False
    assert "error" in result


@pytest.mark.asyncio
async def test_estimate_survives_malformed_json_from_the_model():
    """LLMs occasionally return prose where JSON was demanded."""
    svc, _ = service_with(response=completion("sorry, I can't do that"))
    result = await svc.generate_cleaning_estimate({"sqft": 1200}, ["deep"])
    assert result["success"] is False


@pytest.mark.asyncio
async def test_estimate_returns_model_fields_on_success():
    payload = {
        "estimated_price": 210,
        "price_range": {"min": 180, "max": 240},
        "duration_hours": 3.5,
        "breakdown": [{"item": "Standard clean", "price": 210}],
        "notes": "Urban surcharge applied",
    }
    svc, create = service_with(response=completion(json.dumps(payload)))
    result = await svc.generate_cleaning_estimate(
        {"sqft": 1800, "bedrooms": 3}, ["standard"]
    )
    assert result["success"] is True
    assert result["estimated_price"] == 210
    assert result["duration_hours"] == 3.5
    create.assert_awaited_once()


@pytest.mark.asyncio
async def test_estimate_asks_for_json_and_sends_the_property():
    """The request must pin response_format and actually include the inputs."""
    svc, create = service_with(response=completion(json.dumps({"estimated_price": 1})))
    await svc.generate_cleaning_estimate({"sqft": 999, "bedrooms": 2}, ["deep"])

    kwargs = create.await_args.kwargs
    assert kwargs["response_format"] == {"type": "json_object"}
    sent = json.dumps(kwargs["messages"])
    assert "999" in sent, "property details never reached the model"
    assert "deep" in sent, "requested services never reached the model"


@pytest.mark.asyncio
async def test_chat_survives_openai_outage():
    svc, _ = service_with(error=RuntimeError("rate limited"))
    result = await svc.chat(
        [{"role": "user", "content": "how do I book?"}], user_context={}, role="client"
    )
    assert isinstance(result, dict)
    assert result.get("success") is False


@pytest.mark.asyncio
async def test_document_parsing_survives_outage():
    svc, _ = service_with(error=RuntimeError("vision unavailable"))
    result = await svc.parse_verification_document(
        "https://example.com/licence.png", "business_license"
    )
    assert result.get("success") is False


@pytest.mark.asyncio
async def test_document_parsing_survives_malformed_json():
    svc, _ = service_with(response=completion("not json at all"))
    result = await svc.parse_verification_document(
        "https://example.com/licence.png", "insurance"
    )
    assert result.get("success") is False


@pytest.mark.asyncio
async def test_property_detection_survives_outage():
    svc, _ = service_with(error=RuntimeError("boom"))
    result = await svc.detect_property_details("1 Test St, Austin TX")
    assert result.get("success") is False


# ── endpoint-level: a failing AI must not 500 the caller ──────────────────


@pytest.mark.asyncio
async def test_estimate_endpoint_does_not_500_when_the_model_fails(client):
    """A booking flow must survive an AI outage with a handled response."""
    from tests.money_helpers import make_user

    headers, _, _ = await make_user(client, "client")

    with patch(
        "app.services.ai.ai_service.generate_cleaning_estimate",
        new=AsyncMock(return_value={"success": False, "error": "provider down"}),
    ):
        resp = await client.post(
            "/api/v1/ai/estimate",
            json={"property_details": {"sqft": 1500}, "services_requested": ["standard"]},
            headers=headers,
        )

    assert resp.status_code < 500, (
        f"AI failure surfaced as {resp.status_code}; it must be handled, not a 500"
    )


@pytest.mark.asyncio
async def test_chat_endpoint_does_not_500_when_the_model_fails(client):
    from tests.money_helpers import make_user

    headers, _, _ = await make_user(client, "client")

    with patch(
        "app.services.ai.ai_service.chat",
        new=AsyncMock(return_value={"success": False, "error": "provider down"}),
    ):
        resp = await client.post(
            "/api/v1/ai/chat", json={"message": "hello"}, headers=headers
        )

    assert resp.status_code < 500, f"AI chat failure surfaced as {resp.status_code}"


@pytest.mark.asyncio
async def test_ai_service_never_called_without_stub_in_tests():
    """Guard: the shared singleton must not hold a live key during tests.

    A test that forgets to stub would otherwise bill a real GPT-4o call.
    """
    from app.services.ai import ai_service

    assert ai_service is not None
    # The suite runs with a placeholder/absent key; assert we never configured
    # a production-looking secret into the test process.
    from app.config import get_settings

    key = get_settings().openai_api_key or ""
    assert not key.startswith("sk-proj-"), "a real-looking OpenAI key is set in tests"
