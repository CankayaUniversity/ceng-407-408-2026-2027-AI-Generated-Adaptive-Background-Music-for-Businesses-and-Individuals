"""Inputs of the LLM client."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ImageInput:
    """Raw image bytes plus their media type (e.g. ``image/png``), sent as a base64 data URL."""

    data: bytes
    media_type: str
