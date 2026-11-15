"""ElevenLabs settings and the FastAPI dependency that supplies them."""

import os

from pydantic import BaseModel, Field, SecretStr

from app.core.exceptions import SetupRequiredError

ENV_API_KEY = "ELEVENLABS_API_KEY"
ENV_MODEL_ID = "ELEVENLABS_MODEL_ID"
ENV_OUTPUT_FORMAT = "ELEVENLABS_OUTPUT_FORMAT"


class ElevenLabsConfig(BaseModel):
    """The ``elevenlabs`` settings section."""

    api_key: SecretStr = Field(title="API key", description="ElevenLabs API key.")
    model_id: str = Field(title="Music model", description="Music model id, e.g. music_v2_5.")
    output_format: str | None = Field(
        default=None,
        title="Output format",
        description="Audio format query parameter. Blank means the API default.",
    )


def get_elevenlabs_config() -> ElevenLabsConfig:
    # Temporary: the admin settings store replaces this.
    api_key = os.environ.get(ENV_API_KEY, "").strip()
    model_id = os.environ.get(ENV_MODEL_ID, "").strip()
    missing = [
        name for name, value in ((ENV_API_KEY, api_key), (ENV_MODEL_ID, model_id)) if not value
    ]
    if missing:
        raise SetupRequiredError(f"ElevenLabs is not configured: set {', '.join(missing)}.")
    output_format = os.environ.get(ENV_OUTPUT_FORMAT, "").strip() or None
    return ElevenLabsConfig(
        api_key=SecretStr(api_key), model_id=model_id, output_format=output_format
    )
