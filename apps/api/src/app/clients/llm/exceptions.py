"""Errors raised by the LLM client. Messages never contain secrets or provider payloads."""

from app.core.exceptions import AppError


class LLMError(AppError):
    """Base class for LLM client failures (the upstream provider is a bad gateway)."""

    status_code = 502
    code = "llm_error"


class LLMRequestError(LLMError):
    """The provider could not be reached or answered with an HTTP error."""

    code = "llm_request_failed"


class LLMResponseError(LLMError):
    """The model's answer did not match the requested schema, even after one repair attempt."""

    code = "llm_invalid_response"

    def __init__(self, message: str | None = None, *, detail: str | None = None) -> None:
        super().__init__(message)
        # Validation problems only (field paths and messages), kept out of ``message``.
        self.detail = detail


class LLMConfigError(LLMError):
    """The LLM configuration is internally inconsistent (e.g. ``extra_body`` sets a managed key)."""

    status_code = 500
    code = "llm_config_invalid"
