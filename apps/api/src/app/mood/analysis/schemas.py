"""Result of a mood analysis; also the schema the LLM is asked to fill."""

from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.mood.vector import MoodVector

Tag = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


class MoodAnalysis(BaseModel):
    vector: MoodVector
    summary: str = Field(min_length=1, max_length=300, description="One or two sentences")
    tags: list[Tag] = Field(max_length=8, description="Short mood and scene keywords")
