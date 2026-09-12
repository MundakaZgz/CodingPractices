import pytest

from sliding_window_rate_limiter import SlidingWindowRateLimiter


def test_first_request_and_quota_exhaustion():
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=10)

    assert limiter.allow(0) is True
    assert limiter.allow(1) is True
    assert limiter.allow(2) is False


def test_multiple_requests_at_the_same_instant():
    limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=5)

    assert limiter.allow(10) is True
    assert limiter.allow(10) is True
    assert limiter.allow(10) is True
    assert limiter.allow(10) is False


def test_left_boundary_expires_and_exact_boundary_counts():
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=10)

    assert limiter.allow(0) is True
    assert limiter.allow(10) is True
    assert limiter.allow(10) is True
    assert limiter.allow(10) is False


def test_rejections_do_not_consume_quota_or_reset_window():
    limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=10)

    assert limiter.allow(0) is True
    assert limiter.allow(1) is False
    assert limiter.allow(2) is False
    assert limiter.allow(10) is True
    assert limiter.allow(20.000001) is True


def test_time_jump_expires_multiple_records():
    limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=10)

    assert limiter.allow(0) is True
    assert limiter.allow(1) is True
    assert limiter.allow(2) is True
    assert limiter.allow(11) is True
    assert limiter.allow(11) is True
    assert limiter.allow(11) is False


def test_single_request_capacity():
    limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=3)

    assert limiter.allow(0) is True
    assert limiter.allow(1) is False
    assert limiter.allow(3) is True


@pytest.mark.parametrize(
    "max_requests, window_seconds",
    [
        (0, 10),
        (-1, 10),
        (1, 0),
        (1, -0.1),
    ],
)
def test_invalid_constructor_parameters(max_requests, window_seconds):
    with pytest.raises(ValueError):
        SlidingWindowRateLimiter(max_requests=max_requests, window_seconds=window_seconds)


def test_instances_keep_independent_state():
    limiter_a = SlidingWindowRateLimiter(max_requests=1, window_seconds=10)
    limiter_b = SlidingWindowRateLimiter(max_requests=1, window_seconds=10)

    assert limiter_a.allow(0) is True
    assert limiter_a.allow(1) is False

    assert limiter_b.allow(1) is True
    assert limiter_b.allow(2) is False


def test_handles_large_number_of_calls():
    limiter = SlidingWindowRateLimiter(max_requests=100000, window_seconds=1000000)

    for now in range(100000):
        assert limiter.allow(float(now)) is True
