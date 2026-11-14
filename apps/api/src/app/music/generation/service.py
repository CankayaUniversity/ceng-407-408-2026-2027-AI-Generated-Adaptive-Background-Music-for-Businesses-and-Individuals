"""Track generation logic: one prompt in, MP3 bytes out, with the retry rules for ElevenLabs."""

import asyncio
import logging
from collections.abc import Awaitable, Callable

from app.clients.elevenlabs.client import ElevenLabsClient
from app.clients.elevenlabs.exceptions import (
    ElevenLabsBadPromptError,
    ElevenLabsRateLimitError,
)
from app.music.generation import constants

logger = logging.getLogger(__name__)

type Sleep = Callable[[float], Awaitable[None]]


def rate_limit_delay(attempt: int, retry_after: float | None) -> float:
    """Seconds to wait after the ``attempt``-th rate-limited try (1-based)."""
    if retry_after is not None:
        delay = retry_after
    else:
        delay = constants.BACKOFF_START_SECONDS * constants.BACKOFF_FACTOR ** (attempt - 1)
    return min(delay, constants.MAX_WAIT_SECONDS)


async def generate_track(
    client: ElevenLabsClient,
    prompt: str,
    length_ms: int,
    instrumental: bool,
    *,
    sleep: Sleep = asyncio.sleep,
) -> bytes:
    """Compose one track and return the MP3 bytes.

    - Rate limit (429): wait (Retry-After when given, else 1 s, 2 s) and try again, three tries
      in all, then the last ``ElevenLabsRateLimitError`` is raised.
    - Refused prompt (``bad_prompt``): try once more with the suggested prompt; a second refusal,
      or a refusal without a suggestion, raises ``ElevenLabsBadPromptError``.
    - Every other error is raised at once.
    """
    rate_limited = 0
    suggestion_used = False
    while True:
        try:
            return await client.compose(prompt, length_ms, instrumental)
        except ElevenLabsRateLimitError as exc:
            rate_limited += 1
            if rate_limited >= constants.MAX_RATE_LIMIT_ATTEMPTS:
                raise
            delay = rate_limit_delay(rate_limited, exc.retry_after)
            logger.warning("ElevenLabs rate limit hit; retrying in %.1f s", delay)
            await sleep(delay)
        except ElevenLabsBadPromptError as exc:
            suggestion = (exc.prompt_suggestion or "").strip()
            if suggestion_used or not suggestion:
                raise
            suggestion_used = True
            logger.warning("ElevenLabs refused the prompt; retrying with its suggestion")
            prompt = suggestion
