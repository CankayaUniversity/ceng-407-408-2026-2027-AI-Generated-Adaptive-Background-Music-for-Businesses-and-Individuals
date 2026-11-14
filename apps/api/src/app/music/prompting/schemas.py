"""Request and response of prompt planning; also the schema the LLM is asked to fill.

The plan's rules live here, so a model answer that breaks them fails validation and the LLM
client's repair retry hands the problems back to the model.
"""

from functools import cache
from typing import Annotated, Self

from pydantic import (
    BaseModel,
    Field,
    StringConstraints,
    create_model,
    field_validator,
    model_validator,
)

from app.mood.vector import MoodVector
from app.music.constants import MAX_LENGTH_MS, MAX_PROMPT_CHARS, MIN_LENGTH_MS
from app.music.prompting import guard
from app.music.prompting.constants import (
    DEFAULT_COUNT,
    MAX_COUNT,
    MAX_TITLE_CHARS,
    MIN_COUNT,
)

Title = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_TITLE_CHARS)
]
PromptText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_PROMPT_CHARS)
]
Tag = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]


class PromptPlanRequest(BaseModel):
    mood: MoodVector
    summary: str = Field(max_length=1000, description="What the mood looks and feels like")
    tags: list[Tag] = Field(max_length=20, description="Short mood and scene keywords")
    count: int = Field(
        default=DEFAULT_COUNT, ge=MIN_COUNT, le=MAX_COUNT, description="How many prompts to plan"
    )


class SongPrompt(BaseModel):
    title: Title = Field(description="Short working title for the track")
    prompt: PromptText = Field(
        description="Text sent to the music model: genre, instrumentation, tempo, texture"
    )
    length_ms: int = Field(
        ge=MIN_LENGTH_MS, le=MAX_LENGTH_MS, description="Track length in milliseconds"
    )
    instrumental: bool = Field(default=True, description="True for a track without vocals")

    @field_validator("title", "prompt")
    @classmethod
    def _no_real_references(cls, value: str) -> str:
        found = guard.find_reference(value)
        if found:
            raise ValueError(
                f"must not reference a real artist, band or copyrighted work ('{found}'); "
                "describe genre, instrumentation, tempo and texture instead"
            )
        return value


def _duplicates(values: list[str]) -> list[str]:
    seen: set[str] = set()
    repeated: list[str] = []
    for value in values:
        key = " ".join(value.casefold().split())
        if key in seen and value not in repeated:
            repeated.append(value)
        seen.add(key)
    return repeated


class PromptPlan(BaseModel):
    prompts: list[SongPrompt] = Field(min_length=MIN_COUNT, max_length=MAX_COUNT)

    @model_validator(mode="after")
    def _distinct(self) -> Self:
        for label, values in (
            ("titles", [item.title for item in self.prompts]),
            ("prompts", [item.prompt for item in self.prompts]),
        ):
            repeated = _duplicates(values)
            if repeated:
                shown = "; ".join(f"'{value[:60]}'" for value in repeated)
                raise ValueError(f"every song needs its own {label}, but these repeat: {shown}")
        return self


@cache
def plan_schema(count: int) -> type[PromptPlan]:
    """The plan schema that demands exactly ``count`` prompts, with all of the plan's rules."""
    return create_model(
        f"PromptPlan{count}",
        __base__=PromptPlan,
        prompts=(
            list[SongPrompt],
            Field(min_length=count, max_length=count, description=f"Exactly {count} songs"),
        ),
    )
