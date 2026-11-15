"""LLM connection settings and the environment-backed dependency that supplies them."""

import json
import os
from typing import Any, Literal

from pydantic import BaseModel, Field, SecretStr, ValidationError, field_validator

from app.core.exceptions import SetupRequiredError

# Request fields the client sets itself. ``extra_body`` may never carry them.
RESERVED_EXTRA_BODY_KEYS = frozenset({"model", "messages", "response_format"})

ENV_BASE_URL = "LLM_BASE_URL"
ENV_API_KEY = "LLM_API_KEY"
ENV_MODEL = "LLM_MODEL"
ENV_JSON_MODE = "LLM_JSON_MODE"
ENV_REASONING_EFFORT = "LLM_REASONING_EFFORT"
ENV_EXTRA_BODY = "LLM_EXTRA_BODY"

_REQUIRED_ENV = (ENV_BASE_URL, ENV_API_KEY, ENV_MODEL)


class LLMConfig(BaseModel):
    """Connection and capability settings for an OpenAI-compatible Chat Completions endpoint."""

    base_url: str = Field(min_length=1, description="Base URL of the endpoint, e.g. .../v1")
    api_key: SecretStr = Field(description="API key for the endpoint")
    model: str = Field(min_length=1, description="Model name sent with every request")
    json_mode: Literal["json_schema", "json_object"] = Field(
        default="json_schema",
        description="json_schema for endpoints with structured outputs, else json_object",
    )
    reasoning_effort: str | None = Field(
        default=None, description="Passed through as reasoning_effort when set"
    )
    extra_body: dict[str, Any] = Field(
        default_factory=dict,
        description="JSON merged into every request; cannot set model, messages or response_format",
    )

    @field_validator("extra_body")
    @classmethod
    def _reject_reserved_keys(cls, value: dict[str, Any]) -> dict[str, Any]:
        reserved = sorted(RESERVED_EXTRA_BODY_KEYS & value.keys())
        if reserved:
            raise ValueError(
                f"extra_body must not set {', '.join(reserved)}: the client manages those fields"
            )
        return value


# Temporary: the admin settings store replaces this.
def get_llm_config() -> LLMConfig:
    """Build the LLM config from environment variables, or raise ``SetupRequiredError`` (503)."""
    env = os.environ
    missing = [name for name in _REQUIRED_ENV if not env.get(name, "").strip()]
    if missing:
        raise SetupRequiredError(f"LLM is not configured: set {', '.join(missing)}")

    extra_body: object = {}
    raw_extra = env.get(ENV_EXTRA_BODY, "").strip()
    if raw_extra:
        try:
            extra_body = json.loads(raw_extra)
        except json.JSONDecodeError:
            raise SetupRequiredError(f"{ENV_EXTRA_BODY} must be a JSON object") from None

    try:
        return LLMConfig.model_validate(
            {
                "base_url": env[ENV_BASE_URL].strip(),
                "api_key": env[ENV_API_KEY].strip(),
                "model": env[ENV_MODEL].strip(),
                "json_mode": env.get(ENV_JSON_MODE, "").strip() or "json_schema",
                "reasoning_effort": env.get(ENV_REASONING_EFFORT, "").strip() or None,
                "extra_body": extra_body,
            }
        )
    except ValidationError as exc:
        # Field names and messages only: never the offending input values.
        problems = "; ".join(
            f"{'.'.join(str(part) for part in error['loc'])}: {error['msg']}"
            for error in exc.errors(include_url=False, include_context=False, include_input=False)
        )
        raise SetupRequiredError(f"LLM configuration is invalid: {problems}") from None
