"""Wire models for the ElevenLabs Music API."""

from pydantic import BaseModel


class ComposeRequest(BaseModel):
    """JSON body of ``POST /v1/music`` in prompt mode."""

    prompt: str
    music_length_ms: int
    model_id: str
    force_instrumental: bool
