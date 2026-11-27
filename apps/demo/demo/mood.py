"""Mood analysis (step 2): a venue photo goes in, the Mood that prompt planning uses comes out.

The Mood model lives in planning.py, next to the step that reads it, so both steps share one
definition of the axes.
"""

import base64
from pathlib import Path
from typing import Protocol

from demo.planning import Mood

# The system prompt of the mood request. It is read on every call, so an edit shows up at once
# while tuning it, without restarting the server.
PROMPT_PATH = Path(__file__).parent / "prompts" / "mood.md"

USER_MESSAGE = "What mood should the background music of this place have?"


class AskJson(Protocol):
    """The LLM helper that llm.py provides, here with the image it needs for this step."""

    async def __call__(
        self, schema: type[Mood], *, system: str, user: str, image_url: str | None = None
    ) -> Mood: ...


def image_data_url(data: bytes, media_type: str) -> str:
    """The image as a ``data:`` URL, the form OpenAI-compatible APIs accept inline."""
    return f"data:{media_type};base64,{base64.b64encode(data).decode('ascii')}"


async def analyze_mood(data: bytes, media_type: str, ask_json: AskJson) -> Mood:
    """Ask the LLM what mood the photographed place has.

    ``ask_json`` is passed in, not imported, so this function can be tried with a fake.
    """
    system = PROMPT_PATH.read_text(encoding="utf-8")
    return await ask_json(
        Mood, system=system, user=USER_MESSAGE, image_url=image_data_url(data, media_type)
    )
