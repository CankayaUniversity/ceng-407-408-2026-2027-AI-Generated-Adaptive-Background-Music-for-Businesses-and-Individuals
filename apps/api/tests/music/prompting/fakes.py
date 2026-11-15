"""A scripted LLM for prompt planning tests.

It subclasses the real client and replaces only the network call, so the client's validation
and its single repair retry run exactly as in production.
"""

import json
from typing import Any

from openai.types.chat import ChatCompletionMessageParam
from pydantic import BaseModel, SecretStr

from app.clients.llm.client import LLMClient
from app.clients.llm.config import LLMConfig

GENRES = (
    "warm acoustic folk with fingerpicked guitar",
    "slow ambient pads with soft felt piano",
    "gentle downtempo electronica with muted drums",
    "airy chamber strings with a light harp",
    "mellow jazz trio with brushed drums and upright bass",
    "dusty lo-fi beat with warm Rhodes chords",
)


def song(index: int, **overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "title": f"Morning Light {index}",
        "prompt": f"{GENRES[index % len(GENRES)]}, take {index}, relaxed tempo around 80 BPM",
        "length_ms": 120_000 + index * 1_000,
        "instrumental": True,
    }
    return payload | overrides


def plan_payload(count: int) -> dict[str, Any]:
    return {"prompts": [song(index) for index in range(count)]}


def plan_json(count: int) -> str:
    return json.dumps(plan_payload(count))


def plan_with(count: int, index: int, **overrides: Any) -> str:
    """A plan of ``count`` songs in which song ``index`` carries ``overrides``."""
    payload = plan_payload(count)
    payload["prompts"][index] |= overrides
    return json.dumps(payload)


class ScriptedLLM(LLMClient):
    """Answers each model call with the next scripted reply and records the messages sent."""

    def __init__(self, replies: list[str]) -> None:
        super().__init__(
            LLMConfig(base_url="https://llm.test/v1", api_key=SecretStr("sk-fake"), model="fake")
        )
        self.replies = list(replies)
        self.calls: list[list[ChatCompletionMessageParam]] = []

    async def _complete(
        self, schema: type[BaseModel], messages: list[ChatCompletionMessageParam]
    ) -> str | None:
        self.calls.append(list(messages))
        if not self.replies:
            raise AssertionError("the LLM was called more often than the test scripted")
        return self.replies.pop(0)

    def _content(self, call: int, index: int) -> Any:
        message: Any = self.calls[call][index]
        return message["content"]

    def system_text(self, call: int = 0) -> str:
        return str(self._content(call, 0))

    def user_text(self, call: int = 0) -> str:
        parts = self._content(call, 1)
        assert isinstance(parts, list)
        return str(parts[0]["text"])

    def last_message_text(self, call: int) -> str:
        return str(self._content(call, -1))
