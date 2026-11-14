"""Request of the generation endpoint."""

from pydantic import BaseModel, Field

from app.music.constants import MAX_LENGTH_MS, MAX_PROMPT_CHARS, MIN_LENGTH_MS


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=MAX_PROMPT_CHARS, description="Music prompt")
    length_ms: int = Field(
        ge=MIN_LENGTH_MS, le=MAX_LENGTH_MS, description="Track length in milliseconds"
    )
    instrumental: bool = Field(default=True, description="True for a track without vocals")
