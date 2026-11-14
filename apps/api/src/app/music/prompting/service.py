"""Prompt planning logic: build the request for the LLM and validate how many songs come back."""

from functools import cache
from pathlib import Path
from string import Template

from app.clients.llm.client import LLMClient
from app.mood.vector import MoodVector
from app.music.constants import MAX_LENGTH_MS, MIN_LENGTH_MS
from app.music.prompting.constants import DEFAULT_COUNT, MAX_COUNT, MIN_COUNT
from app.music.prompting.schemas import PromptPlan, plan_schema

# Resolved from this file so it works from the source tree and from an installed wheel.
PROMPT_PATH = Path(__file__).parent / "prompts" / "plan.md"

# Words for the two ends of each axis, used next to the numbers in the request.
_AXES = (
    ("valence", "sad", "happy"),
    ("texture", "acoustic", "electronic"),
    ("energy", "calm", "energetic"),
)


@cache
def load_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


def render_system_prompt(count: int) -> str:
    return Template(load_prompt()).substitute(
        count=count, min_length_ms=MIN_LENGTH_MS, max_length_ms=MAX_LENGTH_MS
    )


def _strength(value: float) -> str:
    magnitude = abs(value)
    if magnitude < 0.15:
        return "neutral"
    if magnitude < 0.45:
        return "slightly"
    if magnitude < 0.75:
        return "clearly"
    return "very"


def describe_axis(value: float, low: str, high: str) -> str:
    strength = _strength(value)
    if strength == "neutral":
        return f"{value:+.2f} (neutral between {low} and {high})"
    return f"{value:+.2f} ({strength} {high if value > 0 else low})"


def build_user_message(mood: MoodVector, summary: str, tags: list[str], count: int) -> str:
    axes = "\n".join(
        f"- {name}: {describe_axis(getattr(mood, name), low, high)}" for name, low, high in _AXES
    )
    return (
        f"Plan {count} songs for this mood.\n\n"
        f"Mood axes (each from -1 to 1):\n{axes}\n\n"
        f"Summary: {summary.strip() or '(none)'}\n"
        f"Tags: {', '.join(tags) or '(none)'}"
    )


async def plan_prompts(
    llm: LLMClient,
    mood: MoodVector,
    summary: str,
    tags: list[str],
    count: int = DEFAULT_COUNT,
) -> PromptPlan:
    """Ask the LLM for ``count`` varied song prompts that fit the mood.

    ``count`` must lie in 5..25, else ``ValueError``. The schema enforces the exact count,
    distinct titles and prompts, and the artist guard; the LLM client repairs once on a failure.
    """
    if not MIN_COUNT <= count <= MAX_COUNT:
        raise ValueError(f"count must be between {MIN_COUNT} and {MAX_COUNT}, got {count}")
    return await llm.generate_structured(
        plan_schema(count),
        system=render_system_prompt(count),
        user=build_user_message(mood, summary, tags, count),
    )
