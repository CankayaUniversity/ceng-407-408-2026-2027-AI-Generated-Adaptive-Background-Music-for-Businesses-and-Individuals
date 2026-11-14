"""ElevenLabs Music client: one prompt in, MP3 bytes out."""

import logging
import math
from typing import Annotated, Any

import httpx
from fastapi import Depends

from app.clients.elevenlabs.config import ElevenLabsConfig, get_elevenlabs_config
from app.clients.elevenlabs.exceptions import (
    ElevenLabsAuthError,
    ElevenLabsBadPromptError,
    ElevenLabsError,
    ElevenLabsRateLimitError,
    ElevenLabsValidationError,
)
from app.clients.elevenlabs.schemas import ComposeRequest
from app.core.logging import register_secrets

logger = logging.getLogger(__name__)

BASE_URL = "https://api.elevenlabs.io"
COMPOSE_PATH = "/v1/music"
DEFAULT_TIMEOUT_SECONDS = 300.0
_MAX_MESSAGE_LENGTH = 500


class ElevenLabsClient:
    def __init__(
        self,
        config: ElevenLabsConfig,
        *,
        base_url: str = BASE_URL,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        self._config = config
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    async def compose(
        self,
        prompt: str,
        length_ms: int,
        instrumental: bool,
        output_format: str | None = None,
    ) -> bytes:
        """Compose one track and return the MP3 bytes.

        ``output_format`` overrides the configured one; with neither set the API default applies.
        """
        body = ComposeRequest(
            prompt=prompt,
            music_length_ms=length_ms,
            model_id=self._config.model_id,
            force_instrumental=instrumental,
        )
        fmt = output_format or self._config.output_format
        params = {"output_format": fmt} if fmt else None
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as http:
                response = await http.post(
                    f"{self._base_url}{COMPOSE_PATH}",
                    json=body.model_dump(),
                    params=params,
                    headers={"xi-api-key": self._config.api_key.get_secret_value()},
                )
        except httpx.HTTPError as exc:
            # The exception text can embed the request, so report only its type.
            raise ElevenLabsError(f"ElevenLabs request failed: {type(exc).__name__}") from None

        if response.is_success:
            if not response.content:
                raise ElevenLabsError("ElevenLabs returned an empty audio body")
            return response.content
        raise self._error_for(response)

    def _error_for(self, response: httpx.Response) -> ElevenLabsError:
        status = response.status_code
        detail = _detail(response)
        message = self._scrub(_message(detail) or f"ElevenLabs returned HTTP {status}")
        logger.warning("ElevenLabs request failed with HTTP %s", status)

        if _field(detail, "status") == "bad_prompt":
            suggestion = _field(detail, "prompt_suggestion") or _field(
                _field(detail, "data"), "prompt_suggestion"
            )
            return ElevenLabsBadPromptError(
                message,
                prompt_suggestion=suggestion if isinstance(suggestion, str) else None,
                upstream_status=status,
            )
        if status == 401:
            return ElevenLabsAuthError(message, upstream_status=status)
        if status == 422:
            return ElevenLabsValidationError(message, upstream_status=status)
        if status == 429:
            return ElevenLabsRateLimitError(
                message,
                retry_after=_retry_after(response.headers.get("retry-after")),
                upstream_status=status,
            )
        return ElevenLabsError(message, upstream_status=status)

    def _scrub(self, text: str) -> str:
        """Cap the message length and make sure the key cannot leak through it."""
        key = self._config.api_key.get_secret_value()
        if key:
            text = text.replace(key, "[REDACTED]")
        return text[:_MAX_MESSAGE_LENGTH]


def _detail(response: httpx.Response) -> Any:
    """The ``detail`` of an error body (ElevenLabs wraps errors in it), else the body itself."""
    try:
        body = response.json()
    except ValueError:
        return None
    if isinstance(body, dict) and "detail" in body:
        return body["detail"]
    return body


def _field(value: Any, name: str) -> Any:
    return value.get(name) if isinstance(value, dict) else None


def _message(detail: Any) -> str | None:
    if isinstance(detail, str):
        return detail
    message = _field(detail, "message")
    return message if isinstance(message, str) else None


def _retry_after(value: str | None) -> float | None:
    """Seconds from a Retry-After header; an HTTP-date value is ignored."""
    if value is None:
        return None
    try:
        seconds = float(value.strip())
    except ValueError:
        return None
    return seconds if math.isfinite(seconds) and seconds >= 0 else None


def get_elevenlabs_client(
    config: Annotated[ElevenLabsConfig, Depends(get_elevenlabs_config)],
) -> ElevenLabsClient:
    register_secrets([config.api_key])
    return ElevenLabsClient(config)
