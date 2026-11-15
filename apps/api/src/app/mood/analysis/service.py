"""Mood analysis logic: upload checks and the LLM call."""

from functools import cache
from pathlib import Path

from app.clients.llm.client import LLMClient
from app.clients.llm.schemas import ImageInput
from app.mood.analysis.exceptions import ImageTooLargeError, UnsupportedImageError
from app.mood.analysis.schemas import MoodAnalysis

MAX_IMAGE_BYTES = 10 * 1024 * 1024

# Resolved from this file so it works from the source tree and from an installed wheel.
PROMPT_PATH = Path(__file__).parent / "prompts" / "analysis.md"

_USER_MESSAGE = "Analyse the mood of the attached image."


@cache
def load_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


def detect_media_type(data: bytes) -> str | None:
    """Return the media type from the file's magic numbers (JPEG, PNG, WEBP), else ``None``."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def validate_image(data: bytes) -> str:
    """Check size and real content type of an upload; return its media type."""
    if len(data) > MAX_IMAGE_BYTES:
        raise ImageTooLargeError(
            f"The image exceeds the {MAX_IMAGE_BYTES // (1024 * 1024)} MB limit"
        )
    media_type = detect_media_type(data)
    if media_type is None:
        raise UnsupportedImageError("Only JPEG, PNG and WEBP images are accepted")
    return media_type


async def analyze_image(llm: LLMClient, data: bytes) -> MoodAnalysis:
    """Validate the image, ask the LLM for its mood and return the validated result."""
    media_type = validate_image(data)
    return await llm.generate_structured(
        MoodAnalysis,
        system=load_prompt(),
        user=_USER_MESSAGE,
        images=[ImageInput(data=data, media_type=media_type)],
    )
