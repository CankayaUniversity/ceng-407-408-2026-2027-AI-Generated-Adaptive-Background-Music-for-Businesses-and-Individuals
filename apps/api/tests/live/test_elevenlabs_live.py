"""Calls the real ElevenLabs API. Excluded by default; run with ``pytest -m live``."""

import os

import pytest

from app.clients.elevenlabs.client import ElevenLabsClient
from app.clients.elevenlabs.config import get_elevenlabs_config

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(
        not (os.environ.get("ELEVENLABS_API_KEY") and os.environ.get("ELEVENLABS_MODEL_ID")),
        reason="ELEVENLABS_API_KEY and ELEVENLABS_MODEL_ID must be set to call ElevenLabs",
    ),
]


async def test_compose_ten_second_instrumental_track() -> None:
    client = ElevenLabsClient(get_elevenlabs_config())

    audio = await client.compose("Calm ambient piano with soft pads", 10_000, True)

    assert len(audio) > 0
