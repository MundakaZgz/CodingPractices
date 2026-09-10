from fetch_with_retry import ApiError, fetch_with_retry
import pytest

def test_immediate_success_returns_value_even_if_none():
    request_calls = []
    sleep_calls = []

    def request():
        request_calls.append("called")
        return None

    def sleep(seconds):
        sleep_calls.append(seconds)

    result = fetch_with_retry(request, sleep)

    assert result is None
    assert len(request_calls) == 1
    assert sleep_calls == []


def test_retries_temporary_errors_then_succeeds():
    responses = [ApiError(503), ApiError(429), {"customer": "Ana"}]
    request_calls = []
    sleep_calls = []

    def request():
        request_calls.append("called")
        value = responses.pop(0)
        if isinstance(value, Exception):
            raise value
        return value

    def sleep(seconds):
        sleep_calls.append(seconds)

    result = fetch_with_retry(request, sleep, max_attempts=4, base_delay=0.5)

    assert result == {"customer": "Ana"}
    assert len(request_calls) == 3
    assert sleep_calls == [0.5, 1.0]


def test_exhausts_attempts_and_uses_exact_backoff():
    request_calls = []
    sleep_calls = []

    def request():
        request_calls.append("called")
        raise ApiError(503)

    def sleep(seconds):
        sleep_calls.append(seconds)

    with pytest.raises(ApiError) as exc_info:
        fetch_with_retry(request, sleep, max_attempts=4, base_delay=0.5)

    assert exc_info.value.status_code == 503
    assert len(request_calls) == 4
    assert sleep_calls == [0.5, 1.0, 2.0]


def test_permanent_api_error_is_not_retried():
    request_calls = []
    sleep_calls = []

    def request():
        request_calls.append("called")
        raise ApiError(401)

    def sleep(seconds):
        sleep_calls.append(seconds)

    with pytest.raises(ApiError) as exc_info:
        fetch_with_retry(request, sleep, max_attempts=5, base_delay=0.5)

    assert exc_info.value.status_code == 401
    assert len(request_calls) == 1
    assert sleep_calls == []


def test_non_api_error_is_not_retried():
    request_calls = []
    sleep_calls = []

    def request():
        request_calls.append("called")
        raise RuntimeError("boom")

    def sleep(seconds):
        sleep_calls.append(seconds)

    with pytest.raises(RuntimeError, match="boom"):
        fetch_with_retry(request, sleep, max_attempts=5, base_delay=0.5)

    assert len(request_calls) == 1
    assert sleep_calls == []


def test_max_attempts_one_makes_single_try_without_sleep():
    request_calls = []
    sleep_calls = []

    def request():
        request_calls.append("called")
        raise ApiError(503)

    def sleep(seconds):
        sleep_calls.append(seconds)

    with pytest.raises(ApiError):
        fetch_with_retry(request, sleep, max_attempts=1, base_delay=0.5)

    assert len(request_calls) == 1
    assert sleep_calls == []


def test_base_delay_zero_retries_without_wait_time():
    responses = [ApiError(500), "ok"]
    sleep_calls = []

    def request():
        value = responses.pop(0)
        if isinstance(value, Exception):
            raise value
        return value

    def sleep(seconds):
        sleep_calls.append(seconds)

    result = fetch_with_retry(request, sleep, max_attempts=2, base_delay=0)

    assert result == "ok"
    assert sleep_calls == [0]


@pytest.mark.parametrize("status_code", [429, *range(500, 600)])
def test_all_retryable_status_codes_are_retried(status_code):
    responses = [ApiError(status_code), "ok"]
    request_calls = []
    sleep_calls = []

    def request():
        request_calls.append("called")
        value = responses.pop(0)
        if isinstance(value, Exception):
            raise value
        return value

    def sleep(seconds):
        sleep_calls.append(seconds)

    result = fetch_with_retry(request, sleep, max_attempts=2, base_delay=0.5)

    assert result == "ok"
    assert len(request_calls) == 2
    assert sleep_calls == [0.5]


@pytest.mark.parametrize(
    "max_attempts,base_delay",
    [
        (0, 0.5),
        (-1, 0.5),
        (3, -0.1),
    ],
)
def test_invalid_parameters_raise_value_error_without_side_effects(max_attempts, base_delay):
    request_calls = []
    sleep_calls = []

    def request():
        request_calls.append("called")
        return "should not run"

    def sleep(seconds):
        sleep_calls.append(seconds)

    with pytest.raises(ValueError):
        fetch_with_retry(request, sleep, max_attempts=max_attempts, base_delay=base_delay)

    assert request_calls == []
    assert sleep_calls == []

