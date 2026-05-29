"""Custom exception hierarchy for the Wrike connector skill."""


class WrikeAPIError(Exception):
    """Base exception for all Wrike API errors.

    Attributes:
        message: Human-readable error description.
        status_code: HTTP status code returned by the API, if applicable.
    """

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code

    def __str__(self) -> str:
        if self.status_code:
            return f"[HTTP {self.status_code}] {self.message}"
        return self.message


class AuthenticationError(WrikeAPIError):
    """Raised when the API returns 401 Unauthorized.

    Causes:
        - Missing or expired access token.
        - Token revoked by a workspace admin.

    Resolution:
        - Check that WRIKE_ACCESS_TOKEN is set and valid.
        - Generate a new permanent token from Wrike → Profile → Apps & Integrations → API.
    """


class PermissionError(WrikeAPIError):
    """Raised when the API returns 403 Forbidden.

    Causes:
        - The authenticated user lacks permission for the requested resource.
        - Trying to write to a read-only resource.

    Resolution:
        - Verify the user has the necessary role/permissions in the Wrike workspace.
    """


class ResourceNotFoundError(WrikeAPIError):
    """Raised when the API returns 404 Not Found.

    Causes:
        - The resource ID does not exist or was deleted.
        - Wrong ID format (v2 ID used where v4 is required).

    Resolution:
        - Confirm the resource exists in the Wrike UI.
        - Use v4 IDs (see WrikeClient.to_v4_id for conversion).
    """


class ValidationError(WrikeAPIError):
    """Raised when the API returns 400 Bad Request.

    Causes:
        - Missing required fields.
        - Invalid field value or type.
        - Constraint violation (e.g., end date before start date).

    Resolution:
        - Review the request parameters against the Wrike API docs.
    """


class RateLimitError(WrikeAPIError):
    """Raised when the API returns 429 Too Many Requests.

    Wrike allows 400 requests per 60-second window per access token.
    WrikeClient retries automatically with exponential backoff before raising this.

    Resolution:
        - Reduce request frequency.
        - If using multiple tokens, distribute load across them.
    """


class ServerError(WrikeAPIError):
    """Raised when the API returns 5xx Server Error.

    Causes:
        - Transient Wrike platform issues.

    Resolution:
        - Retry after a short delay.
        - Check https://status.wrike.com for platform incidents.
    """
