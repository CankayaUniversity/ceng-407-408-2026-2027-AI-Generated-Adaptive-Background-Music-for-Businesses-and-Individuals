"""FastAPI dependencies of the generation endpoint."""

import asyncio

from app.music.generation.service import Sleep


def get_sleep() -> Sleep:
    """The sleep function used between retries; tests override it so they never wait."""
    return asyncio.sleep
