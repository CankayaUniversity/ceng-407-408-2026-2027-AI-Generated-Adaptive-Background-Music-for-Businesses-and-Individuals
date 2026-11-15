"""Calls the real LLM configured through the LLM_* environment variables. Run with ``-m live``."""

import os

import pytest

from app.clients.llm.client import LLMClient
from app.clients.llm.config import get_llm_config
from app.mood.vector import MoodVector
from app.music.prompting import service

_REQUIRED = ("LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL")

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(
        not all(os.environ.get(name) for name in _REQUIRED),
        reason="set LLM_BASE_URL, LLM_API_KEY and LLM_MODEL to run live LLM tests",
    ),
]


async def test_real_llm_plans_five_distinct_prompts() -> None:
    client = LLMClient(get_llm_config())
    try:
        result = await service.plan_prompts(
            client,
            MoodVector(valence=0.5, texture=-0.6, energy=-0.3),
            "A quiet, sunny morning in a wooden kitchen.",
            ["calm", "warm", "morning"],
            5,
        )
    finally:
        await client.aclose()

    assert len(result.prompts) == 5
    assert len({item.prompt.casefold() for item in result.prompts}) == 5
    assert len({item.title.casefold() for item in result.prompts}) == 5
