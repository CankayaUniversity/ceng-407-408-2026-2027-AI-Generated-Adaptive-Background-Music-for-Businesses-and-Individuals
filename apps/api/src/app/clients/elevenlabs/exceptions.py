"""Typed ElevenLabs errors. Messages never contain the API key."""

from app.core.exceptions import AppError


class ElevenLabsError(AppError):
    """Any failed ElevenLabs request. Subclasses cover the documented cases."""

    status_code = 502
    code = "elevenlabs_error"

    def __init__(self, message: str | None = None, *, upstream_status: int | None = None) -> None:
        super().__init__(message)
        self.upstream_status = upstream_status


class ElevenLabsAuthError(ElevenLabsError):
    """401: the API key is invalid. A server configuration problem, not the caller's."""

    code = "elevenlabs_auth_error"


class ElevenLabsValidationError(ElevenLabsError):
    """422: the API rejected the request parameters."""

    code = "elevenlabs_validation_error"


class ElevenLabsRateLimitError(ElevenLabsError):
    """429: rate limit exceeded. ``retry_after`` is the Retry-After header in seconds."""

    status_code = 429
    code = "elevenlabs_rate_limited"

    def __init__(
        self,
        message: str | None = None,
        *,
        retry_after: float | None = None,
        upstream_status: int | None = 429,
    ) -> None:
        super().__init__(message, upstream_status=upstream_status)
        self.retry_after = retry_after


class ElevenLabsBadPromptError(ElevenLabsError):
    """The prompt was refused (e.g. it names an artist). ``prompt_suggestion`` is a safe rewrite."""

    status_code = 422
    code = "elevenlabs_bad_prompt"

    def __init__(
        self,
        message: str | None = None,
        *,
        prompt_suggestion: str | None = None,
        upstream_status: int | None = None,
    ) -> None:
        super().__init__(message, upstream_status=upstream_status)
        self.prompt_suggestion = prompt_suggestion
