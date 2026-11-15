import base64
import json
from collections.abc import AsyncIterator
from typing import Any

import httpx
import pytest
import pytest_asyncio
import respx
from pydantic import BaseModel, Field, SecretStr

from app.clients.llm.client import LLMClient
from app.clients.llm.config import LLMConfig
from app.clients.llm.exceptions import LLMConfigError, LLMRequestError, LLMResponseError
from app.clients.llm.schemas import ImageInput

BASE_URL = "https://llm.test/v1"
ENDPOINT = f"{BASE_URL}/chat/completions"
API_KEY = "sk-very-secret"


class Answer(BaseModel):
    score: float = Field(ge=0, le=1)
    label: str


def make_config(**overrides: Any) -> LLMConfig:
    fields: dict[str, Any] = {
        "base_url": BASE_URL,
        "api_key": SecretStr(API_KEY),
        "model": "test-model",
    }
    fields.update(overrides)
    return LLMConfig(**fields)


def make_client(**overrides: Any) -> LLMClient:
    # respx patches httpx, not the httpx2 client the SDK uses by default, so inject a plain one.
    return LLMClient(make_config(**overrides), http_client=httpx.AsyncClient())


def completion(content: str | None) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "id": "chatcmpl-1",
            "object": "chat.completion",
            "created": 0,
            "model": "test-model",
            "choices": [
                {
                    "index": 0,
                    "finish_reason": "stop",
                    "message": {"role": "assistant", "content": content},
                }
            ],
        },
    )


GOOD = json.dumps({"score": 0.5, "label": "ok"})
BAD = json.dumps({"score": 7, "label": "ok"})


def sent_body(route: respx.Route, call: int = 0) -> dict[str, Any]:
    return json.loads(route.calls[call].request.content)


@pytest_asyncio.fixture
async def llm() -> AsyncIterator[LLMClient]:
    client = make_client()
    yield client
    await client.aclose()


async def ask(client: LLMClient, **kwargs: Any) -> Answer:
    return await client.generate_structured(Answer, system="Be brief.", user="Rate it.", **kwargs)


@respx.mock
async def test_json_schema_mode_sends_schema_derived_from_model(llm: LLMClient) -> None:
    route = respx.post(ENDPOINT).mock(return_value=completion(GOOD))

    result = await ask(llm)

    assert result == Answer(score=0.5, label="ok")
    body = sent_body(route)
    assert body["model"] == "test-model"
    assert body["response_format"]["type"] == "json_schema"
    json_schema = body["response_format"]["json_schema"]
    assert json_schema["name"] == "Answer"
    assert json_schema["schema"] == Answer.model_json_schema()
    assert route.calls[0].request.headers["authorization"] == f"Bearer {API_KEY}"


@respx.mock
async def test_json_object_mode_puts_schema_and_word_json_in_prompt() -> None:
    client = make_client(json_mode="json_object")
    route = respx.post(ENDPOINT).mock(return_value=completion(GOOD))

    result = await ask(client)
    await client.aclose()

    assert result.label == "ok"
    body = sent_body(route)
    assert body["response_format"] == {"type": "json_object"}
    system_prompt = body["messages"][0]["content"]
    assert "JSON" in system_prompt
    assert json.dumps(Answer.model_json_schema()) in system_prompt


@respx.mock
async def test_json_schema_mode_does_not_add_schema_to_prompt(llm: LLMClient) -> None:
    route = respx.post(ENDPOINT).mock(return_value=completion(GOOD))

    await ask(llm)

    assert sent_body(route)["messages"][0]["content"] == "Be brief."


@respx.mock
async def test_images_are_sent_as_base64_data_urls(llm: LLMClient) -> None:
    route = respx.post(ENDPOINT).mock(return_value=completion(GOOD))
    raw = b"\x89PNG\r\n\x1a\nfake"

    await ask(llm, images=[ImageInput(data=raw, media_type="image/png")])

    user_message = sent_body(route)["messages"][1]
    assert user_message["role"] == "user"
    assert user_message["content"][0] == {"type": "text", "text": "Rate it."}
    assert user_message["content"][1] == {
        "type": "image_url",
        "image_url": {"url": f"data:image/png;base64,{base64.b64encode(raw).decode()}"},
    }


@respx.mock
async def test_reasoning_effort_and_extra_body_are_merged() -> None:
    client = make_client(reasoning_effort="low", extra_body={"thinking": {"type": "disabled"}})
    route = respx.post(ENDPOINT).mock(return_value=completion(GOOD))

    await ask(client)
    await client.aclose()

    body = sent_body(route)
    assert body["reasoning_effort"] == "low"
    assert body["thinking"] == {"type": "disabled"}


@pytest.mark.parametrize("key", ["model", "messages", "response_format"])
@respx.mock
async def test_extra_body_cannot_override_managed_fields(key: str) -> None:
    # The config model already rejects these keys; model_construct bypasses that check to prove
    # the client itself refuses them too, before any request is made.
    config = LLMConfig.model_construct(
        base_url=BASE_URL,
        api_key=SecretStr(API_KEY),
        model="test-model",
        json_mode="json_schema",
        reasoning_effort=None,
        extra_body={key: "evil"},
    )
    route = respx.post(ENDPOINT).mock(return_value=completion(GOOD))

    with pytest.raises(LLMConfigError, match=key):
        LLMClient(config)

    assert not route.called


@respx.mock
async def test_repair_retry_succeeds_on_second_attempt(llm: LLMClient) -> None:
    route = respx.post(ENDPOINT).mock(side_effect=[completion(BAD), completion(GOOD)])

    result = await ask(llm)

    assert result == Answer(score=0.5, label="ok")
    assert route.call_count == 2
    repair_messages = sent_body(route, 1)["messages"]
    assert repair_messages[-2] == {"role": "assistant", "content": BAD}
    assert repair_messages[-1]["role"] == "user"
    assert "score" in repair_messages[-1]["content"]
    assert "less than or equal to 1" in repair_messages[-1]["content"]


@respx.mock
async def test_invalid_json_is_repaired_too(llm: LLMClient) -> None:
    route = respx.post(ENDPOINT).mock(side_effect=[completion("not json"), completion(GOOD)])

    assert (await ask(llm)).label == "ok"
    assert route.call_count == 2


@respx.mock
async def test_code_fenced_json_is_accepted_without_retry(llm: LLMClient) -> None:
    route = respx.post(ENDPOINT).mock(return_value=completion(f"```json\n{GOOD}\n```"))

    assert (await ask(llm)).label == "ok"
    assert route.call_count == 1


@respx.mock
async def test_empty_content_is_repaired(llm: LLMClient) -> None:
    route = respx.post(ENDPOINT).mock(side_effect=[completion(None), completion(GOOD)])

    assert (await ask(llm)).label == "ok"
    assert route.call_count == 2


@respx.mock
async def test_failed_repair_raises_after_exactly_two_calls(llm: LLMClient) -> None:
    route = respx.post(ENDPOINT).mock(side_effect=[completion(BAD), completion(BAD)])

    with pytest.raises(LLMResponseError) as caught:
        await ask(llm)

    assert route.call_count == 2
    assert caught.value.status_code == 502
    assert caught.value.detail is not None
    assert "score" in caught.value.detail
    assert API_KEY not in caught.value.message
    assert API_KEY not in caught.value.detail


@respx.mock
async def test_http_error_becomes_request_error_without_secrets() -> None:
    client = make_client()
    respx.post(ENDPOINT).mock(
        return_value=httpx.Response(401, json={"error": {"message": f"bad key {API_KEY}"}})
    )

    with pytest.raises(LLMRequestError) as caught:
        await ask(client)
    await client.aclose()

    assert "401" in caught.value.message
    assert API_KEY not in caught.value.message


@respx.mock
async def test_unreachable_provider_becomes_request_error() -> None:
    client = make_client()
    respx.post(ENDPOINT).mock(side_effect=httpx.ConnectError("boom"))

    with pytest.raises(LLMRequestError, match="Could not reach"):
        await ask(client)
    await client.aclose()
