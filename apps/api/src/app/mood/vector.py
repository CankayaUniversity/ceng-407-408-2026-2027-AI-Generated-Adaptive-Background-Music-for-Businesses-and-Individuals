"""The three-axis mood representation shared by every mood and music feature."""

from pydantic import BaseModel, Field


class MoodVector(BaseModel):
    """A mood as three axes, each in ``[-1, 1]``."""

    valence: float = Field(ge=-1, le=1, description="-1 sad, +1 happy")
    texture: float = Field(ge=-1, le=1, description="-1 acoustic, +1 electronic")
    energy: float = Field(ge=-1, le=1, description="-1 calm, +1 energetic")
