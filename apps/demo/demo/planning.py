"""Prompt planning data: the mood that goes in and the five song prompts that come out.

FastAPI uses these models to check the request and the response of POST /api/plan. llm.py will
show their JSON schema to the LLM and check the LLM's answer against them. When an answer breaks a
rule, the error text is sent back to the LLM once so it can fix itself, so the messages below are
written for the model to read.
"""

from typing import Annotated, Self

from pydantic import BaseModel, Field, StringConstraints, model_validator

PLAN_SIZE = 5

# Our own limits for background music: one to five minutes. ElevenLabs Music itself accepts
# 3 000 to 600 000 ms, so every length that passes here is accepted there too. prompts/plan.md
# asks the LLM for 90 000 to 240 000, a little inside this range, so small misses still pass.
MIN_LENGTH_MS = 60_000
MAX_LENGTH_MS = 300_000

MAX_TITLE_CHARS = 80
# A conservative cap of our own: the ElevenLabs reference states no prompt limit.
MAX_PROMPT_CHARS = 2_000

Title = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_TITLE_CHARS)
]
PromptText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_PROMPT_CHARS)
]
Tag = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]


class Mood(BaseModel):
    """The mood analysis result (step 2) and the input of prompt planning (step 3)."""

    valence: float = Field(ge=-1, le=1, description="-1 sad, +1 happy")
    texture: float = Field(ge=-1, le=1, description="-1 acoustic, +1 electronic")
    energy: float = Field(ge=-1, le=1, description="-1 calm, +1 energetic")
    summary: str = Field(max_length=1000, description="What the place looks and feels like")
    tags: list[Tag] = Field(max_length=20, description="Short mood and scene keywords")


class SongPrompt(BaseModel):
    """One planned song: what to tell the music model and how long the track should be."""

    title: Title = Field(description="Short working title for the track")
    prompt: PromptText = Field(
        description="Text for the music model: genre, instrumentation, tempo, texture"
    )
    length_ms: int = Field(
        ge=MIN_LENGTH_MS, le=MAX_LENGTH_MS, description="Track length in milliseconds"
    )
    instrumental: bool = Field(default=True, description="True for a track without vocals")


def _repeated(values: list[str]) -> list[str]:
    """The values that appear more than once, ignoring case and extra spaces."""
    seen: set[str] = set()
    repeated: list[str] = []
    for value in values:
        key = " ".join(value.casefold().split())
        if key in seen and value not in repeated:
            repeated.append(value)
        seen.add(key)
    return repeated


class PromptPlan(BaseModel):
    """The answer of prompt planning: exactly five songs that all differ from each other."""

    prompts: list[SongPrompt] = Field(
        min_length=PLAN_SIZE, max_length=PLAN_SIZE, description=f"Exactly {PLAN_SIZE} songs"
    )

    @model_validator(mode="after")
    def _all_different(self) -> Self:
        for label, values in (
            ("titles", [song.title for song in self.prompts]),
            ("prompts", [song.prompt for song in self.prompts]),
        ):
            repeated = _repeated(values)
            if repeated:
                shown = "; ".join(f"'{value[:60]}'" for value in repeated)
                raise ValueError(f"every song needs its own {label}, but these repeat: {shown}")
        return self
