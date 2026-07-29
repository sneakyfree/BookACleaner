"""Route optimizer.

17% covered, and it decides the order a cleaner drives their day — a bad route
is billed in fuel and unpaid hours. The TSP internals are pure functions, so
these assert mathematical properties (every stop visited exactly once, 2-opt
never returns a worse route) rather than just exercising the code.
"""
import math

import pytest

from app.services.route_optimizer import RouteOptimizer, haversine_distance


optimizer = RouteOptimizer()


# Real coordinates, so distances can be checked against known values.
NYC = (40.7128, -74.0060)
LA = (34.0522, -118.2437)
AUSTIN = (30.2672, -97.7431)


# ── distance maths ────────────────────────────────────────────────────────


def test_haversine_matches_known_distance():
    """NYC->LA is ~3,936 km. Allow 1% for earth-radius rounding."""
    d = haversine_distance(*NYC, *LA)
    assert 3900 < d < 3980, f"got {d} km"


def test_haversine_is_zero_for_identical_points():
    assert haversine_distance(*AUSTIN, *AUSTIN) == pytest.approx(0.0, abs=1e-9)


def test_haversine_is_symmetric():
    """Distance A->B must equal B->A, or the matrix is inconsistent."""
    assert haversine_distance(*NYC, *LA) == pytest.approx(
        haversine_distance(*LA, *NYC), rel=1e-9
    )


def test_haversine_obeys_triangle_inequality():
    """Direct route can never exceed a detour."""
    direct = haversine_distance(*NYC, *LA)
    via_austin = haversine_distance(*NYC, *AUSTIN) + haversine_distance(*AUSTIN, *LA)
    assert direct <= via_austin + 1e-6


def test_travel_time_scales_with_distance():
    assert optimizer.estimate_travel_time(0) == 0
    t40 = optimizer.estimate_travel_time(40)   # one hour at 40 km/h
    assert t40 == pytest.approx(60, abs=1)
    assert optimizer.estimate_travel_time(80) > t40


# ── distance matrix ───────────────────────────────────────────────────────


def _locs(*coords):
    return [{"lat": la, "lng": ln} for la, ln in coords]


def test_distance_matrix_diagonal_is_zero():
    m = optimizer.calculate_distance_matrix(_locs(NYC, LA, AUSTIN))
    for i in range(3):
        assert m[i][i] == 0.0


def test_distance_matrix_is_symmetric():
    m = optimizer.calculate_distance_matrix(_locs(NYC, LA, AUSTIN))
    for i in range(3):
        for j in range(3):
            assert m[i][j] == pytest.approx(m[j][i], rel=1e-9)


def test_distance_matrix_handles_empty_input():
    assert optimizer.calculate_distance_matrix([]) == []


# ── nearest neighbour ─────────────────────────────────────────────────────


def test_nearest_neighbour_visits_every_stop_exactly_once():
    """Dropping or repeating a stop means a cleaner misses or redoes a job."""
    m = optimizer.calculate_distance_matrix(_locs(NYC, LA, AUSTIN, (41.8781, -87.6298)))
    route, _ = optimizer.solve_tsp_nearest_neighbor(m)
    assert sorted(route) == [0, 1, 2, 3]
    assert len(route) == len(set(route))


def test_nearest_neighbour_starts_where_told():
    m = optimizer.calculate_distance_matrix(_locs(NYC, LA, AUSTIN))
    route, _ = optimizer.solve_tsp_nearest_neighbor(m, start_index=2)
    assert route[0] == 2


def test_nearest_neighbour_picks_the_closer_stop_first():
    """From Austin, Chicago is nearer than LA — it must be visited first."""
    chicago = (41.8781, -87.6298)
    m = optimizer.calculate_distance_matrix(_locs(AUSTIN, LA, chicago))
    route, _ = optimizer.solve_tsp_nearest_neighbor(m, start_index=0)
    assert route[1] == 2, f"expected Chicago (index 2) first, got route {route}"


def test_nearest_neighbour_handles_empty_and_single():
    assert optimizer.solve_tsp_nearest_neighbor([]) == ([], 0.0)
    route, dist = optimizer.solve_tsp_nearest_neighbor([[0.0]])
    assert route == [0] and dist == 0.0


# ── 2-opt ─────────────────────────────────────────────────────────────────


def test_two_opt_never_returns_a_worse_route():
    """2-opt is an improvement pass; it must never degrade the input."""
    coords = [NYC, LA, AUSTIN, (41.8781, -87.6298), (47.6062, -122.3321)]
    m = optimizer.calculate_distance_matrix(_locs(*coords))

    deliberately_bad = [0, 1, 2, 3, 4]

    def length(route):
        return sum(m[route[i]][route[i + 1]] for i in range(len(route) - 1))

    before = length(deliberately_bad)
    improved, after = optimizer.solve_tsp_2opt(m, deliberately_bad)

    assert after <= before + 1e-9, f"2-opt made it worse: {before} -> {after}"
    assert after == pytest.approx(length(improved), rel=1e-9), (
        "reported distance does not match the route it returned"
    )


def test_two_opt_preserves_every_stop():
    coords = [NYC, LA, AUSTIN, (41.8781, -87.6298)]
    m = optimizer.calculate_distance_matrix(_locs(*coords))
    improved, _ = optimizer.solve_tsp_2opt(m, [0, 1, 2, 3])
    assert sorted(improved) == [0, 1, 2, 3]


def test_two_opt_keeps_the_starting_point_fixed():
    """The cleaner starts from where they are; 2-opt must not reorder that."""
    coords = [NYC, LA, AUSTIN, (41.8781, -87.6298)]
    m = optimizer.calculate_distance_matrix(_locs(*coords))
    improved, _ = optimizer.solve_tsp_2opt(m, [0, 1, 2, 3])
    assert improved[0] == 0


def test_two_opt_actually_improves_a_crossing_route():
    """A route that crosses itself has a strictly shorter uncrossed ordering."""
    square = [(0.0, 0.0), (0.0, 1.0), (1.0, 1.0), (1.0, 0.0)]
    m = optimizer.calculate_distance_matrix(_locs(*square))
    crossing = [0, 2, 1, 3]  # diagonal-first: self-intersecting

    def length(route):
        return sum(m[route[i]][route[i + 1]] for i in range(len(route) - 1))

    _, after = optimizer.solve_tsp_2opt(m, crossing)
    assert after < length(crossing), "2-opt failed to uncross a crossing route"


# ── end-to-end job optimisation ───────────────────────────────────────────


def _job(job_id, lat, lng, address="somewhere"):
    return {"id": job_id, "property": {"lat": lat, "lng": lng, "address": address}}


@pytest.mark.asyncio
async def test_optimize_jobs_returns_every_job():
    jobs = [
        _job("j1", *AUSTIN),
        _job("j2", *LA),
        _job("j3", *NYC),
    ]
    result = await optimizer.optimize_jobs(jobs)
    ids = [s["job"]["id"] for s in result["optimized_jobs"]]
    assert sorted(ids) == ["j1", "j2", "j3"]


@pytest.mark.asyncio
async def test_optimize_jobs_numbers_stops_sequentially():
    jobs = [_job("a", *AUSTIN), _job("b", *LA), _job("c", *NYC)]
    result = await optimizer.optimize_jobs(jobs)
    assert [s["order"] for s in result["optimized_jobs"]] == [1, 2, 3]


@pytest.mark.asyncio
async def test_optimize_jobs_response_schema_is_consistent_when_empty():
    """The empty case must not return different keys from the normal case.

    It returned `total_distance` / `total_travel_time` while every other path
    returns `total_distance_km` / `total_travel_minutes`, so a caller reading
    the documented field crashed on a cleaner with no jobs.
    """
    populated = await optimizer.optimize_jobs([_job("j1", *AUSTIN)])
    empty = await optimizer.optimize_jobs([])
    assert set(empty).issuperset(
        {"optimized_jobs", "total_distance_km", "total_travel_minutes"}
    ), f"empty-case keys {sorted(empty)} differ from populated {sorted(populated)}"


@pytest.mark.asyncio
async def test_optimize_jobs_orders_nearby_stops_together():
    """Two Austin jobs and one in LA: the Austin pair must not be split."""
    jobs = [
        _job("austin-1", 30.2672, -97.7431),
        _job("la", *LA),
        _job("austin-2", 30.2700, -97.7500),
    ]
    result = await optimizer.optimize_jobs(jobs)
    order = [s["job"]["id"] for s in result["optimized_jobs"]]
    assert abs(order.index("austin-1") - order.index("austin-2")) == 1, (
        f"nearby stops were split across the route: {order}"
    )


@pytest.mark.asyncio
async def test_optimize_jobs_reports_travel_between_stops():
    jobs = [_job("j1", *AUSTIN), _job("j2", *LA)]
    result = await optimizer.optimize_jobs(jobs)
    assert result["travel_segments"], "no travel segments reported"
    seg = result["travel_segments"][0]
    assert seg["distance_km"] > 0
    assert seg["minutes"] > 0
    assert result["total_travel_minutes"] == sum(
        s["minutes"] for s in result["travel_segments"]
    )


@pytest.mark.asyncio
async def test_optimize_jobs_single_job_has_no_travel():
    result = await optimizer.optimize_jobs([_job("only", *AUSTIN)])
    assert len(result["optimized_jobs"]) == 1
    assert result["total_travel_minutes"] == 0
    assert result["travel_segments"] == []


@pytest.mark.asyncio
async def test_optimize_jobs_respects_start_location():
    """Starting from LA, the LA job should come before the NYC one."""
    jobs = [_job("nyc", *NYC), _job("la", *LA)]
    result = await optimizer.optimize_jobs(
        jobs, start_location={"lat": LA[0], "lng": LA[1]}
    )
    order = [s["job"]["id"] for s in result["optimized_jobs"]]
    assert order[0] == "la", f"did not start near the start location: {order}"
