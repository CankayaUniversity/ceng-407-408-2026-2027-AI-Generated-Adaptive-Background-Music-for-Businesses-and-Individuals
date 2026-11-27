"""Ask an OpenAI-compatible LLM for JSON that follows a Pydantic model.

Both LLM steps go through ask_json(): mood analysis (with the snapshot) and prompt planning (text
only). The endpoint, key and model come from apps/demo/.env, so any OpenAI-compatible provider
works as long as the model accepts images.
"""

import json
import re

from fastapi import HTTPException
from openai import (
    APIConnectionError,
    APIStatusError,
    AsyncOpenAI,
    AuthenticationError,
    PermissionDeniedError,
    RateLimitError,
)
from pydantic import BaseModel, ValidationError

from demo.config import require

# Mood analysis with an image usually answers in a few seconds; a minute leaves room for slow
# providers without leaving the page hanging forever.
TIMEOUT_SECONDS = 60

# Some models wrap the JSON in a Markdown code fence even in JSON mode.
_FENCE = re.compile(r"^\s*```(?:json)?\s*(.*?)\s*```\s*$", re.DOTALL | re.IGNORECASE)


def _strip_fence(text: str) -> str:
    match = _FENCE.match(text)
    return match.group(1) if match else text.strip()


def _system_prompt(system: str, schema: type[BaseModel]) -> str:
    """The step's own prompt plus the JSON schema the answer has to follow."""
    return (
        f"{system.rstrip()}\n\n"
        "Answer with a single JSON object, without a code fence or any other text. "
        "It must follow this JSON schema:\n"
        f"{json.dumps(schema.model_json_schema(), ensure_ascii=False)}"
    )


def _user_content(user: str, image_url: str | None) -> str | list[dict]:
    if image_url is None:
        return user
    return [
        {"type": "text", "text": user},
        {"type": "image_url", "image_url": {"url": image_url}},
    ]


def _describe_errors(error: ValidationError) -> str:
    """Validation errors as short lines the model can read, for example "energy: ... <= 1"."""
    lines = []
    for item in error.errors(include_url=False):
        where = ".".join(str(part) for part in item["loc"]) or "(whole answer)"
        lines.append(f"- {where}: {item['msg']}")
    return "\n".join(lines)


async def _complete(client: AsyncOpenAI, model: str, messages: list[dict]) -> str:
    """One Chat Completions call in JSON mode; provider failures become readable HTTP errors."""
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
        )
    # The provider's own message is not passed on for key errors: some echo part of the key.
    except (AuthenticationError, PermissionDeniedError) as exc:
        raise HTTPException(
            status_code=502, detail="The LLM provider rejected LLM_API_KEY; check apps/demo/.env"
        ) from exc
    except RateLimitError as exc:
        raise HTTPException(
            status_code=503,
            detail="The LLM provider is rate limiting or out of credit; try again later",
        ) from exc
    except APIStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"The LLM request failed (HTTP {exc.status_code}); check LLM_MODEL "
            "and that the model accepts images",
        ) from exc
    except APIConnectionError as exc:
        raise HTTPException(
            status_code=502, detail="Could not reach the LLM; check LLM_BASE_URL"
        ) from exc
    if not response.choices:
        return ""
    return response.choices[0].message.content or ""


async def ask_json[T: BaseModel](
    schema: type[T], *, system: str, user: str, image_url: str | None = None
) -> T:
    """Send the texts (and an optional image) to the LLM and return an answer that follows schema.

    The schema goes into the system prompt and JSON mode is switched on. When the answer is not
    valid JSON or breaks a rule of the model, the errors are sent back once and the LLM is asked
    again; a second bad answer is an HTTP 502. ``image_url`` is a ``data:`` URL or a web address.
    """
    client = AsyncOpenAI(
        base_url=require("LLM_BASE_URL"),
        api_key=require("LLM_API_KEY"),
        timeout=TIMEOUT_SECONDS,
        max_retries=1,
    )
    model = require("LLM_MODEL")
    messages: list[dict] = [
        {"role": "system", "content": _system_prompt(system, schema)},
        {"role": "user", "content": _user_content(user, image_url)},
    ]

    answer = await _complete(client, model, messages)
    try:
        return schema.model_validate_json(_strip_fence(answer))
    except ValidationError as first_error:
        problems = _describe_errors(first_error)

    messages += [
        {"role": "assistant", "content": answer},
        {
            "role": "user",
            "content": "Your answer was rejected:\n"
            f"{problems}\n"
            "Answer again with only the corrected JSON object.",
        },
    ]
    answer = await _complete(client, model, messages)
    try:
        return schema.model_validate_json(_strip_fence(answer))
    except ValidationError as second_error:
        raise HTTPException(
            status_code=502,
            detail="The LLM answer did not match the expected format, even after one retry:\n"
            f"{_describe_errors(second_error)}",
        ) from second_error
