"""LLM client for OpenAI-compatible Chat Completions endpoints with schema-validated output."""

import base64
import json
import logging
import re
from collections.abc import AsyncIterator, Sequence
from typing import TYPE_CHECKING, Annotated, Any, cast

import openai
from fastapi import Depends
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionContentPartParam, ChatCompletionMessageParam
from openai.types.shared_params import ResponseFormatJSONObject, ResponseFormatJSONSchema
from pydantic import BaseModel, ValidationError

from app.clients.llm.config import RESERVED_EXTRA_BODY_KEYS, LLMConfig, get_llm_config
from app.clients.llm.exceptions import LLMConfigError, LLMRequestError, LLMResponseError
from app.clients.llm.schemas import ImageInput
from app.core.logging import register_secrets

if TYPE_CHECKING:
    import httpx

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS = 120.0

_CODE_FENCE = re.compile(r"^```[a-zA-Z0-9]*\s*\n(.*?)\n?```\s*$", re.DOTALL)

type _ResponseFormat = ResponseFormatJSONSchema | ResponseFormatJSONObject


class _InvalidOutput(Exception):
    """The model's content is not valid JSON for the schema; ``problems`` says why."""

    def __init__(self, problems: str) -> None:
        super().__init__(problems)
        self.problems = problems


def _describe(exc: ValidationError) -> str:
    """Field paths and messages only, without input values or documentation URLs."""
    return "\n".join(
        f"- {'.'.join(str(part) for part in error['loc']) or '(root)'}: {error['msg']}"
        for error in exc.errors(include_url=False, include_context=False, include_input=False)
    )


def _parse[T: BaseModel](schema: type[T], content: str | None) -> T:
    if content is None or not content.strip():
        raise _InvalidOutput("- (root): the response was empty")
    text = content.strip()
    fenced = _CODE_FENCE.match(text)
    if fenced:
        text = fenced.group(1)
    try:
        return schema.model_validate_json(text)
    except ValidationError as exc:
        raise _InvalidOutput(_describe(exc)) from None


class LLMClient:
    """Produces responses validated against a caller-supplied Pydantic model.

    ``config.extra_body`` is merged into every request body. It may not contain ``model``,
    ``messages`` or ``response_format``: the client sets those itself, so the constructor
    rejects such keys with ``LLMConfigError`` instead of silently dropping or honouring them.
    ``config.reasoning_effort``, when set, is sent as ``reasoning_effort`` and wins over the
    same key in ``extra_body``. ``http_client`` replaces the SDK's HTTP client (used by tests).
    """

    def __init__(
        self, config: LLMConfig, *, http_client: "httpx.AsyncClient | None" = None
    ) -> None:
        reserved = sorted(RESERVED_EXTRA_BODY_KEYS & config.extra_body.keys())
        if reserved:
            raise LLMConfigError(
                f"extra_body must not set {', '.join(reserved)}: the client manages those fields"
            )
        register_secrets([config.api_key])
        self._config = config
        self._client = AsyncOpenAI(
            base_url=config.base_url,
            api_key=config.api_key.get_secret_value(),
            timeout=REQUEST_TIMEOUT_SECONDS,
            # The SDK defaults to its own httpx2 client, which respx cannot intercept. Tests pass
            # a legacy httpx client, which the SDK accepts at runtime but does not type.
            http_client=cast("Any", http_client),
        )

    async def aclose(self) -> None:
        await self._client.close()

    async def generate_structured[T: BaseModel](
        self,
        schema: type[T],
        *,
        system: str,
        user: str,
        images: Sequence[ImageInput] = (),
    ) -> T:
        """Ask the model for an instance of ``schema``.

        On a validation failure the model gets the problems back for exactly one repair
        attempt (two model calls at most); a second failure raises ``LLMResponseError``.
        """
        messages = self._build_messages(schema, system, user, images)
        content = await self._complete(schema, messages)
        try:
            return _parse(schema, content)
        except _InvalidOutput as first:
            logger.warning("LLM output failed validation for %s; retrying once", schema.__name__)
            messages = [
                *messages,
                {"role": "assistant", "content": content or ""},
                {
                    "role": "user",
                    "content": (
                        "Your previous reply did not match the required format:\n"
                        f"{first.problems}\n"
                        "Reply again with only the corrected JSON."
                    ),
                },
            ]
            repaired = await self._complete(schema, messages)
            try:
                return _parse(schema, repaired)
            except _InvalidOutput as second:
                raise LLMResponseError(
                    f"The model did not return a valid {schema.__name__} after one repair attempt",
                    detail=second.problems,
                ) from None

    def _build_messages[T: BaseModel](
        self, schema: type[T], system: str, user: str, images: Sequence[ImageInput]
    ) -> list[ChatCompletionMessageParam]:
        if self._config.json_mode == "json_object":
            # json_object only guarantees valid JSON, so the schema goes in the prompt.
            system = (
                f"{system}\n\n"
                "Respond with a single JSON object that conforms to this JSON Schema, "
                "and nothing else:\n"
                f"{json.dumps(schema.model_json_schema())}"
            )
        parts: list[ChatCompletionContentPartParam] = [{"type": "text", "text": user}]
        for image in images:
            encoded = base64.b64encode(image.data).decode("ascii")
            parts.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{image.media_type};base64,{encoded}"},
                }
            )
        return [
            {"role": "system", "content": system},
            {"role": "user", "content": parts},
        ]

    def _response_format(self, schema: type[BaseModel]) -> _ResponseFormat:
        if self._config.json_mode == "json_object":
            return {"type": "json_object"}
        # strict stays off: strict mode rejects common constraints and many compatible endpoints.
        # The reply is validated against the model either way.
        return {
            "type": "json_schema",
            "json_schema": {
                "name": schema.__name__,
                "schema": schema.model_json_schema(),
                "strict": False,
            },
        }

    async def _complete(
        self, schema: type[BaseModel], messages: list[ChatCompletionMessageParam]
    ) -> str | None:
        body = dict(self._config.extra_body)
        if self._config.reasoning_effort:
            body["reasoning_effort"] = self._config.reasoning_effort
        try:
            completion = await self._client.chat.completions.create(
                model=self._config.model,
                messages=messages,
                response_format=self._response_format(schema),
                extra_body=body,
            )
        except openai.APIStatusError as exc:
            raise LLMRequestError(
                f"The LLM provider answered with HTTP {exc.status_code}"
            ) from None
        except openai.APIConnectionError:
            raise LLMRequestError("Could not reach the LLM provider") from None
        if not completion.choices:
            return None
        return completion.choices[0].message.content


async def get_llm_client(
    config: Annotated[LLMConfig, Depends(get_llm_config)],
) -> AsyncIterator[LLMClient]:
    """Yield an ``LLMClient`` for the request and close its HTTP connections afterwards."""
    client = LLMClient(config)
    try:
        yield client
    finally:
        await client.aclose()
