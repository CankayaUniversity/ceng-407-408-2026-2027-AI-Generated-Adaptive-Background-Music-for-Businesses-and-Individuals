"""A stand-in LLM client for tests that must not reach a provider."""

from collections.abc import Sequence
from typing import Any

from pydantic import BaseModel, SecretStr

from app.clients.llm.client import LLMClient
from app.clients.llm.config import LLMConfig
from app.clients.llm.schemas import ImageInput

ANALYSIS_PAYLOAD: dict[str, Any] = {
    "vector": {"valence": 0.5, "texture": -0.5, "energy": 0.1},
    "summary": "Calm.",
    "tags": ["calm"],
}


class FakeLLM(LLMClient):
    """Records every call and answers with ``payload`` validated against the requested schema."""

    def __init__(self, payload: dict[str, Any] | None = None) -> None:
        super().__init__(
            LLMConfig(base_url="https://llm.test/v1", api_key=SecretStr("sk-fake"), model="fake")
        )
        self.payload = payload or ANALYSIS_PAYLOAD
        self.calls: list[dict[str, Any]] = []

    async def generate_structured[T: BaseModel](
        self,
        schema: type[T],
        *,
        system: str,
        user: str,
        images: Sequence[ImageInput] = (),
    ) -> T:
        self.calls.append(
            {"schema": schema, "system": system, "user": user, "images": list(images)}
        )
        return schema.model_validate(self.payload)
