"""Calls the real LLM configured through the LLM_* environment variables. Run with ``-m live``."""

import os
import struct
import zlib

import pytest

from app.clients.llm.client import LLMClient
from app.clients.llm.config import get_llm_config
from app.mood.analysis import service

_REQUIRED = ("LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL")

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(
        not all(os.environ.get(name) for name in _REQUIRED),
        reason="set LLM_BASE_URL, LLM_API_KEY and LLM_MODEL to run live LLM tests",
    ),
]


def _gradient_png(size: int = 64) -> bytes:
    """A warm orange-to-purple gradient, built with the standard library only."""

    def chunk(kind: bytes, payload: bytes) -> bytes:
        body = kind + payload
        return struct.pack(">I", len(payload)) + body + struct.pack(">I", zlib.crc32(body))

    rows = bytearray()
    for y in range(size):
        rows.append(0)  # filter type: none
        for x in range(size):
            rows += bytes((255 - x * 2, 120 - y, 60 + y * 2))
    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(bytes(rows)))
        + chunk(b"IEND", b"")
    )


async def test_real_llm_returns_a_mood_vector_in_range() -> None:
    client = LLMClient(get_llm_config())
    try:
        result = await service.analyze_image(client, _gradient_png())
    finally:
        await client.aclose()

    for axis in (result.vector.valence, result.vector.texture, result.vector.energy):
        assert -1 <= axis <= 1
    assert result.summary
