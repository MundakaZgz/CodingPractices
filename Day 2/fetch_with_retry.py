class ApiError(Exception):
    def __init__(self, status_code):
        self.status_code = status_code
        super().__init__(f"API Error with status code {status_code}")


def fetch_with_retry(request, sleep, max_attempts=3, base_delay=0.5):
    attempts = 0
    delay_multiplier = 1
    controlled_status_codes = list(range(500, 600)) + [429]

    if max_attempts < 1 or base_delay < 0:
        raise ValueError("Invalid parameters: max_attempts must be >= 1 and base_delay must be >= 0")

    while attempts < max_attempts:
        try:
            return request()
        except ApiError as e:
            if e.status_code in controlled_status_codes:
                attempts += 1
                if attempts == max_attempts:
                    raise 
                sleep(base_delay * delay_multiplier)
                delay_multiplier *= 2
            else:
                raise 
    # If we exit the loop without returning, it means all attempts failed
    raise ApiError(500)
