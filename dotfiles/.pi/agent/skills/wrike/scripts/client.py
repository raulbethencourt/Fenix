"""Core Wrike API client with authentication, rate limiting, and retry logic."""

import os
import time
from pathlib import Path
from typing import Any

import requests

from .exceptions import (
    AuthenticationError,
    PermissionError,
    RateLimitError,
    ResourceNotFoundError,
    ServerError,
    ValidationError,
    WrikeAPIError,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_BASE_URL = "https://www.wrike.com/api/v4"
_MAX_RETRIES = 3
_RETRY_BACKOFF_BASE = 2  # seconds; retry waits 2, 4, 8 …


# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------


class RateLimiter:
    """Proactive sliding-window rate limiter.

    Tracks outbound call timestamps over a rolling ``period`` window.
    If the number of calls in that window reaches ``max_calls``, the next
    call blocks until the oldest call falls outside the window.

    Wrike's documented limit is 400 requests per 60-second window.

    Args:
        max_calls: Maximum number of calls allowed in ``period`` seconds.
        period: Length of the sliding window in seconds.
    """

    def __init__(self, max_calls: int = 400, period: float = 60.0) -> None:
        self.max_calls = max_calls
        self.period = period
        self._calls: list[float] = []

    def wait_if_needed(self) -> None:
        """Block the caller if the rate limit would be exceeded."""
        now = time.time()
        # Evict timestamps outside the current window
        self._calls = [t for t in self._calls if now - t < self.period]

        if len(self._calls) >= self.max_calls:
            sleep_for = self.period - (now - self._calls[0])
            if sleep_for > 0:
                time.sleep(sleep_for)

        self._calls.append(time.time())


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


class WrikeClient:
    """Low-level Wrike REST API v4 client.

    Handles authentication, rate limiting, automatic retry on 429, and maps
    HTTP error codes to typed exceptions.

    All higher-level helpers (epics, stories, tasks, …) accept an instance of
    this class rather than building their own HTTP sessions.

    Args:
        access_token: Wrike permanent or OAuth access token. Defaults to
            the ``WRIKE_ACCESS_TOKEN`` environment variable.
        base_url: API base URL. Defaults to ``WRIKE_BASE_URL`` env var or
            ``https://www.wrike.com/api/v4``.

    Raises:
        ValueError: If ``access_token`` cannot be resolved.

    Example:
        >>> client = WrikeClient()          # reads from environment
        >>> spaces = client.get("spaces")
        >>> print(spaces[0]["title"])
    """

    def __init__(
        self,
        access_token: str | None = None,
        base_url: str | None = None,
    ) -> None:
        self._access_token = access_token or self._load_access_token()
        self.base_url = (
            base_url
            or os.environ.get("WRIKE_BASE_URL")
            or DEFAULT_BASE_URL
        ).rstrip("/")

        self._rate_limiter = RateLimiter()
        self._session = requests.Session()
        self._session.headers.update(
            {
                "Authorization": f"bearer {self._access_token}",
                "Content-Type": "application/json",
            }
        )

    # ------------------------------------------------------------------
    # Public HTTP helpers
    # ------------------------------------------------------------------

    def get(self, endpoint: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """Send a GET request and return the ``data`` array.

        Args:
            endpoint: API path relative to base URL (e.g. ``"spaces"``).
            params: Optional query-string parameters.

        Returns:
            The ``data`` list from the Wrike JSON envelope.

        Raises:
            WrikeAPIError: On any non-2xx response.
        """
        return self._request("GET", endpoint, params=params)

    def post(
        self,
        endpoint: str,
        payload: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Send a POST request and return the ``data`` array.

        Args:
            endpoint: API path relative to base URL.
            payload: JSON body dict.
            params: Optional query-string parameters.

        Returns:
            The ``data`` list from the Wrike JSON envelope.
        """
        return self._request("POST", endpoint, json=payload, params=params)

    def put(
        self,
        endpoint: str,
        payload: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Send a PUT request and return the ``data`` array.

        Args:
            endpoint: API path relative to base URL.
            payload: JSON body dict.
            params: Optional query-string parameters.

        Returns:
            The ``data`` list from the Wrike JSON envelope.
        """
        return self._request("PUT", endpoint, json=payload, params=params)

    def delete(self, endpoint: str) -> list[dict[str, Any]]:
        """Send a DELETE request and return the ``data`` array.

        Args:
            endpoint: API path relative to base URL.

        Returns:
            The ``data`` list from the Wrike JSON envelope (often empty).
        """
        return self._request("DELETE", endpoint)

    def post_multipart(
        self,
        endpoint: str,
        files: dict[str, Any],
        headers: dict[str, str] | None = None,
    ) -> list[dict[str, Any]]:
        """Send a multipart/form-data POST (used for file uploads).

        The ``Content-Type`` header is intentionally omitted from the session
        defaults so that ``requests`` can set the correct multipart boundary.

        Args:
            endpoint: API path relative to base URL.
            files: Dict passed directly to ``requests`` ``files`` parameter.
            headers: Extra headers (e.g. ``X-File-Name``).

        Returns:
            The ``data`` list from the Wrike JSON envelope.
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        request_headers = {"Authorization": f"bearer {self._access_token}"}
        if headers:
            request_headers.update(headers)

        self._rate_limiter.wait_if_needed()
        try:
            response = self._session.post(url, files=files, headers=request_headers)
        except requests.RequestException as exc:
            raise WrikeAPIError(f"Request failed: {exc}") from exc

        return self._parse_response(response)

    def get_tasks_batch(self, task_ids: list[str]) -> list[dict[str, Any]]:
        """Fetch full task details for a list of IDs using the batch endpoint.

        The ``folders/{id}/tasks`` endpoint silently strips ``responsibleIds``
        from its response regardless of the ``fields`` parameter.  The only
        reliable way to get correct assignee data is to fetch tasks
        individually or via the batch ``tasks/{id1,id2,...}`` endpoint.

        This method splits ``task_ids`` into chunks of 100 (Wrike's batch
        limit) and returns the fully-hydrated task dicts.

        Args:
            task_ids: List of Wrike task IDs to fetch.

        Returns:
            List of fully-hydrated task dicts with correct ``responsibleIds``.

        Example::

            ids = [t["id"] for t in client.get("folders/XYZ/tasks")]
            tasks = client.get_tasks_batch(ids)
        """
        if not task_ids:
            return []
        result: list[dict[str, Any]] = []
        for i in range(0, len(task_ids), 100):
            chunk = task_ids[i : i + 100]
            batch = self.get(f"tasks/{','.join(chunk)}")
            result.extend(batch if isinstance(batch, list) else batch.get("data", []))
        return result

    def close(self) -> None:
        """Close the underlying HTTP session."""
        self._session.close()

    def __enter__(self) -> "WrikeClient":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _request(
        self,
        method: str,
        endpoint: str,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Execute an HTTP request with rate limiting and retry on 429.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE).
            endpoint: API path relative to base URL.
            json: JSON body (for POST/PUT).
            params: Query-string parameters.

        Returns:
            The ``data`` list extracted from the Wrike response envelope.

        Raises:
            RateLimitError: After ``_MAX_RETRIES`` exhausted on 429.
            WrikeAPIError: On any other non-2xx response or network failure.
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}"

        for attempt in range(_MAX_RETRIES):
            self._rate_limiter.wait_if_needed()
            try:
                response = self._session.request(method, url, json=json, params=params)
            except requests.RequestException as exc:
                raise WrikeAPIError(f"Request failed: {exc}") from exc

            if response.status_code == 429:
                if attempt < _MAX_RETRIES - 1:
                    time.sleep(_RETRY_BACKOFF_BASE ** attempt)
                    continue
                raise RateLimitError(
                    "Rate limit exceeded after retries — reduce request frequency.",
                    status_code=429,
                )

            return self._parse_response(response)

        # Unreachable, but satisfies the type checker
        raise WrikeAPIError("Unexpected retry loop exit.")

    @staticmethod
    def _parse_response(response: requests.Response) -> list[dict[str, Any]]:
        """Map an HTTP response to data or a typed exception.

        Args:
            response: The raw ``requests.Response`` object.

        Returns:
            The ``data`` array from the Wrike JSON envelope.

        Raises:
            AuthenticationError: On 401.
            PermissionError: On 403.
            ResourceNotFoundError: On 404.
            ValidationError: On 400.
            RateLimitError: On 429 (when called directly, not via retry loop).
            ServerError: On 5xx.
            WrikeAPIError: On any other non-2xx status.
        """
        status = response.status_code

        if 200 <= status < 300:
            body = response.json()
            return body.get("data", [])

        # Try to extract Wrike's error description from the body
        try:
            body = response.json()
            detail = body.get("errorDescription") or body.get("error") or response.text
        except Exception:
            detail = response.text

        if status == 400:
            raise ValidationError(f"Bad request: {detail}", status_code=status)
        if status == 401:
            raise AuthenticationError(f"Authentication failed: {detail}", status_code=status)
        if status == 403:
            raise PermissionError(f"Permission denied: {detail}", status_code=status)
        if status == 404:
            raise ResourceNotFoundError(f"Resource not found: {detail}", status_code=status)
        if status == 429:
            raise RateLimitError(f"Rate limit exceeded: {detail}", status_code=status)
        if status >= 500:
            raise ServerError(f"Wrike server error: {detail}", status_code=status)

        raise WrikeAPIError(f"Unexpected API response: {detail}", status_code=status)

    @staticmethod
    def _load_access_token() -> str:
        """Resolve the access token from environment or .env file.

        Looks for ``WRIKE_ACCESS_TOKEN`` first in the process environment,
        then in a ``.env`` file located next to the ``scripts/`` directory.

        Returns:
            The access token string.

        Raises:
            ValueError: If the token cannot be found.
        """
        # Try process environment first
        token = os.environ.get("WRIKE_ACCESS_TOKEN")
        if token:
            return token

        # Try loading from .env beside the scripts/ directory
        env_path = Path(__file__).parent.parent / ".env"
        if env_path.exists():
            with open(env_path) as fh:
                for line in fh:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, _, value = line.partition("=")
                        if key.strip() == "WRIKE_ACCESS_TOKEN" and value.strip():
                            return value.strip()

        raise ValueError(
            "WRIKE_ACCESS_TOKEN is not set. "
            "Export it as an environment variable or add it to a .env file."
        )
