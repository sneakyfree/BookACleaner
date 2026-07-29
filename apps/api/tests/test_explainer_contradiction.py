"""Explainer and contradiction detector.

These are the "show your working" layer — the part that tells a client why they
were charged and warns them when a booking does not add up. An explanation that
disagrees with the actual charge is worse than no explanation, so the central
property here is arithmetic honesty: the components must sum to the total.

Both services are pure functions, so everything below is exact rather than
approximate.
"""
from datetime import date, time, timedelta

import pytest

from app.services.contradiction import ContradictionDetector, ContradictionSeverity
from app.services.explainer import ExplainerService


# ── the explanation must add up ───────────────────────────────────────────


def _sum_components(explanation):
    return sum(c.amount for c in explanation.price_components)


def test_price_components_sum_to_the_total():
    """If the breakdown does not equal the charge, the explanation is a lie."""
    e = ExplainerService.explain_job_price(
        base_price=200.0, property_size=2500, service_type="deep",
        urgency="urgent", cleaner_tier=5,
    )
    assert _sum_components(e) == pytest.approx(e.final_amount, rel=1e-9)


def test_plain_booking_costs_exactly_the_base_price():
    """No size, urgency or tier adjustment means no surprise line items."""
    e = ExplainerService.explain_job_price(
        base_price=150.0, property_size=1000, service_type="standard",
        urgency="normal", cleaner_tier=1,
    )
    assert e.final_amount == pytest.approx(150.0)
    assert len(e.price_components) == 1


def test_large_property_adds_thirty_percent():
    small = ExplainerService.explain_job_price(
        base_price=100.0, property_size=1500, service_type="standard", cleaner_tier=1
    )
    large = ExplainerService.explain_job_price(
        base_price=100.0, property_size=2500, service_type="standard", cleaner_tier=1
    )
    assert large.final_amount == pytest.approx(small.final_amount + 30.0)


def test_size_surcharge_boundary_is_strictly_above_2000():
    at_boundary = ExplainerService.explain_job_price(
        base_price=100.0, property_size=2000, service_type="standard", cleaner_tier=1
    )
    just_over = ExplainerService.explain_job_price(
        base_price=100.0, property_size=2001, service_type="standard", cleaner_tier=1
    )
    assert at_boundary.final_amount == pytest.approx(100.0)
    assert just_over.final_amount > 100.0


@pytest.mark.parametrize(
    "urgency,expected",
    [("normal", 100.0), ("soon", 115.0), ("urgent", 130.0), ("emergency", 150.0)],
)
def test_urgency_multipliers_are_applied_exactly(urgency, expected):
    e = ExplainerService.explain_job_price(
        base_price=100.0, property_size=1000, service_type="standard",
        urgency=urgency, cleaner_tier=1,
    )
    assert e.final_amount == pytest.approx(expected)


def test_unknown_urgency_does_not_surcharge():
    """An unrecognised value must fall back to normal, not crash or guess."""
    e = ExplainerService.explain_job_price(
        base_price=100.0, property_size=1000, service_type="standard",
        urgency="whenever", cleaner_tier=1,
    )
    assert e.final_amount == pytest.approx(100.0)


@pytest.mark.parametrize(
    "tier,expected", [(1, 100.0), (2, 105.0), (3, 110.0), (4, 115.0), (5, 120.0)]
)
def test_cleaner_tier_premium_is_applied_exactly(tier, expected):
    e = ExplainerService.explain_job_price(
        base_price=100.0, property_size=1000, service_type="standard",
        urgency="normal", cleaner_tier=tier,
    )
    assert e.final_amount == pytest.approx(expected)


def test_discounts_reduce_the_total_and_are_shown_as_negative():
    e = ExplainerService.explain_job_price(
        base_price=200.0, property_size=1000, service_type="standard",
        urgency="normal", cleaner_tier=1,
        discounts=[{"name": "First Clean", "amount": 25.0}],
    )
    assert e.final_amount == pytest.approx(175.0)
    discount_lines = [c for c in e.price_components if c.is_discount]
    assert len(discount_lines) == 1
    assert discount_lines[0].amount == -25.0
    assert _sum_components(e) == pytest.approx(e.final_amount)


def test_multiple_discounts_all_apply():
    e = ExplainerService.explain_job_price(
        base_price=300.0, property_size=1000, service_type="standard", cleaner_tier=1,
        discounts=[
            {"name": "Referral", "amount": 20.0},
            {"name": "Weekly", "amount": 30.0},
        ],
    )
    assert e.final_amount == pytest.approx(250.0)
    assert _sum_components(e) == pytest.approx(e.final_amount)


def test_every_surcharge_is_disclosed_as_a_line_item():
    """A client must be able to see where each dollar went."""
    e = ExplainerService.explain_job_price(
        base_price=100.0, property_size=3000, service_type="deep",
        urgency="emergency", cleaner_tier=5,
    )
    names = {c.name for c in e.price_components}
    assert {"Base Service", "Large Property", "Priority Scheduling", "Premium Cleaner"} <= names
    assert _sum_components(e) == pytest.approx(e.final_amount)


def test_client_summary_states_the_amount_actually_charged():
    """The human-readable line must match the computed total."""
    e = ExplainerService.explain_job_price(
        base_price=100.0, property_size=2500, service_type="deep",
        urgency="urgent", cleaner_tier=4,
    )
    assert f"${e.final_amount:.2f}" in e.client_summary


def test_client_factors_are_present_for_every_surcharge():
    e = ExplainerService.explain_job_price(
        base_price=100.0, property_size=3000, service_type="deep",
        urgency="urgent", cleaner_tier=5,
    )
    assert len(e.client_factors) >= 4, e.client_factors


# ── contradiction detection ───────────────────────────────────────────────


FUTURE = date.today() + timedelta(days=7)
NOON = time(12, 0)


def test_consistent_booking_raises_nothing():
    result = ContradictionDetector.detect_booking_contradictions(
        property_size=1500, service_type="standard", estimated_hours=3.0,
        scheduled_date=FUTURE, scheduled_time=NOON, urgency="normal",
        special_requests=None,
    )
    assert result.has_contradictions is False
    assert result.can_proceed is True
    assert result.blocker_count == 0


def test_implausibly_short_estimate_is_flagged():
    """3000 sq ft in half an hour is not a real booking."""
    result = ContradictionDetector.detect_booking_contradictions(
        property_size=3000, service_type="deep", estimated_hours=0.5,
        scheduled_date=FUTURE, scheduled_time=NOON, urgency="normal",
        special_requests=None,
    )
    assert result.has_contradictions is True
    assert any(
        c.field1 == "property_size" and c.field2 == "estimated_hours"
        for c in result.contradictions
    )


def test_past_date_is_flagged():
    result = ContradictionDetector.detect_booking_contradictions(
        property_size=1500, service_type="standard", estimated_hours=3.0,
        scheduled_date=date.today() - timedelta(days=3), scheduled_time=NOON,
        urgency="normal", special_requests=None,
    )
    assert result.has_contradictions is True


def test_blockers_prevent_proceeding_and_warnings_do_not():
    """can_proceed must track blockers only — warnings inform, they don't stop."""
    result = ContradictionDetector.detect_booking_contradictions(
        property_size=3000, service_type="deep", estimated_hours=0.5,
        scheduled_date=FUTURE, scheduled_time=NOON, urgency="normal",
        special_requests=None,
    )
    blockers = [
        c for c in result.contradictions
        if c.severity == ContradictionSeverity.BLOCKER
    ]
    assert result.blocker_count == len(blockers)
    assert result.can_proceed == (len(blockers) == 0)


def test_counts_match_the_returned_contradictions():
    """Summary counts must agree with the list, or the UI misreports."""
    result = ContradictionDetector.detect_booking_contradictions(
        property_size=4000, service_type="move_out", estimated_hours=0.5,
        scheduled_date=date.today() - timedelta(days=1), scheduled_time=NOON,
        urgency="emergency", special_requests="also repaint the walls",
    )
    warnings = [
        c for c in result.contradictions
        if c.severity == ContradictionSeverity.WARNING
    ]
    blockers = [
        c for c in result.contradictions
        if c.severity == ContradictionSeverity.BLOCKER
    ]
    assert result.warning_count == len(warnings)
    assert result.blocker_count == len(blockers)
    assert result.has_contradictions == bool(result.contradictions)


def test_missing_optional_inputs_do_not_crash():
    """Partial booking forms are normal; detection must tolerate them."""
    result = ContradictionDetector.detect_booking_contradictions(
        property_size=None, service_type="standard", estimated_hours=None,
        scheduled_date=FUTURE, scheduled_time=NOON, urgency="normal",
        special_requests=None,
    )
    assert result.has_contradictions in (True, False)
    assert isinstance(result.contradictions, list)


def test_every_contradiction_carries_an_actionable_message():
    """A flag with no explanation cannot be acted on by the client."""
    result = ContradictionDetector.detect_booking_contradictions(
        property_size=4000, service_type="deep", estimated_hours=0.5,
        scheduled_date=date.today() - timedelta(days=2), scheduled_time=NOON,
        urgency="emergency", special_requests=None,
    )
    for c in result.contradictions:
        assert c.message and c.message.strip(), f"empty message on {c.id}"
        assert c.severity in tuple(ContradictionSeverity)


def test_contradiction_ids_are_unique_within_a_result():
    """Duplicate ids break client-side dismissal of individual warnings."""
    result = ContradictionDetector.detect_booking_contradictions(
        property_size=4000, service_type="move_out", estimated_hours=0.25,
        scheduled_date=date.today() - timedelta(days=1), scheduled_time=NOON,
        urgency="emergency", special_requests="repaint and re-tile",
    )
    ids = [c.id for c in result.contradictions]
    assert len(ids) == len(set(ids)), f"duplicate contradiction ids: {ids}"
