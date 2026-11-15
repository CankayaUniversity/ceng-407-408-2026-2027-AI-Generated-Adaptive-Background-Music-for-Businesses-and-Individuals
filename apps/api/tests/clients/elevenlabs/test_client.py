import json

import httpx
import pytest
import respx
from pydantic import SecretStr

from app.clients.elevenlabs.client import ElevenLabsClient
from app.clients.elevenlabs.config import ElevenLabsConfig
from app.clients.elevenlabs.exceptions import (
    ElevenLabsAuthError,
    ElevenLabsBadPromptError,
    ElevenLabsError,
    ElevenLabsRateLimitError,
    ElevenLabsValidationError,
)

API_KEY = "sk-secret-key-1234567890"
URL = "https://api.elevenlabs.io/v1/music"
MP3 = b"ID3\x04\x00\x00fake-mp3-bytes"


def make_client(output_format: str | None = None) -> ElevenLabsClient:
    config = ElevenLabsConfig(
        api_key=SecretStr(API_KEY), model_id="music_v2_5", output_format=output_format
    )
    return ElevenLabsClient(config)


def assert_no_key(exc: BaseException) -> None:
    assert API_KEY not in str(exc)
    assert API_KEY not in repr(exc)
    assert API_KEY not in repr(exc.args)


@respx.mock
async def test_compose_returns_mp3_and_sends_expected_request() -> None:
    route = respx.post(URL).mock(return_value=httpx.Response(200, content=MP3))

    audio = await make_client().compose("calm piano", 10_000, True)

    assert audio == MP3
    request = route.calls.last.request
    assert json.loads(request.content) == {
        "prompt": "calm piano",
        "music_length_ms": 10_000,
        "model_id": "music_v2_5",
        "force_instrumental": True,
    }
    assert request.headers["xi-api-key"] == API_KEY
    assert request.url.params.get("output_format") is None
    assert "output_format" not in request.url.query.decode()


@respx.mock
async def test_compose_sends_configured_output_format_as_query() -> None:
    route = respx.post(URL).mock(return_value=httpx.Response(200, content=MP3))

    await make_client(output_format="mp3_44100_128").compose("p", 5_000, False)

    request = route.calls.last.request
    assert request.url.params["output_format"] == "mp3_44100_128"
    assert json.loads(request.content)["force_instrumental"] is False
    assert "output_format" not in json.loads(request.content)


@respx.mock
async def test_compose_argument_overrides_configured_output_format() -> None:
    route = respx.post(URL).mock(return_value=httpx.Response(200, content=MP3))

    await make_client(output_format="mp3_44100_128").compose(
        "p", 5_000, True, output_format="mp3_48000_192"
    )

    assert route.calls.last.request.url.params["output_format"] == "mp3_48000_192"


@respx.mock
async def test_401_raises_auth_error() -> None:
    respx.post(URL).mock(
        return_value=httpx.Response(
            401, json={"detail": {"status": "invalid_api_key", "message": "Invalid API key"}}
        )
    )

    with pytest.raises(ElevenLabsAuthError) as info:
        await make_client().compose("p", 5_000, True)

    assert info.value.upstream_status == 401
    assert_no_key(info.value)


@respx.mock
async def test_422_raises_validation_error() -> None:
    respx.post(URL).mock(
        return_value=httpx.Response(
            422, json={"detail": [{"loc": ["body", "music_length_ms"], "msg": "too short"}]}
        )
    )

    with pytest.raises(ElevenLabsValidationError) as info:
        await make_client().compose("p", 1, True)

    assert info.value.upstream_status == 422
    assert_no_key(info.value)


@respx.mock
async def test_429_raises_rate_limit_with_retry_after() -> None:
    respx.post(URL).mock(
        return_value=httpx.Response(
            429, headers={"Retry-After": "12"}, json={"detail": {"message": "slow down"}}
        )
    )

    with pytest.raises(ElevenLabsRateLimitError) as info:
        await make_client().compose("p", 5_000, True)

    assert info.value.retry_after == 12
    assert info.value.status_code == 429
    assert_no_key(info.value)


@respx.mock
@pytest.mark.parametrize("headers", [{}, {"Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT"}])
async def test_429_without_numeric_retry_after(headers: dict[str, str]) -> None:
    respx.post(URL).mock(return_value=httpx.Response(429, headers=headers))

    with pytest.raises(ElevenLabsRateLimitError) as info:
        await make_client().compose("p", 5_000, True)

    assert info.value.retry_after is None


@respx.mock
@pytest.mark.parametrize("status", [400, 422])
async def test_bad_prompt_carries_suggestion(status: int) -> None:
    respx.post(URL).mock(
        return_value=httpx.Response(
            status,
            json={
                "detail": {
                    "status": "bad_prompt",
                    "message": "The prompt mentions a protected artist.",
                    "data": {"prompt_suggestion": "A warm 60s-style pop song with harmonies"},
                }
            },
        )
    )

    with pytest.raises(ElevenLabsBadPromptError) as info:
        await make_client().compose("a song like the Beatles", 5_000, False)

    assert info.value.prompt_suggestion == "A warm 60s-style pop song with harmonies"
    assert info.value.upstream_status == status
    assert_no_key(info.value)


@respx.mock
async def test_500_raises_generic_error() -> None:
    respx.post(URL).mock(return_value=httpx.Response(500, text="boom"))

    with pytest.raises(ElevenLabsError) as info:
        await make_client().compose("p", 5_000, True)

    assert type(info.value) is ElevenLabsError
    assert info.value.upstream_status == 500
    assert "500" in str(info.value)
    assert_no_key(info.value)


@respx.mock
async def test_error_message_echoing_the_key_is_redacted() -> None:
    respx.post(URL).mock(
        return_value=httpx.Response(
            401, json={"detail": {"message": f"Key {API_KEY} is not valid"}}
        )
    )

    with pytest.raises(ElevenLabsAuthError) as info:
        await make_client().compose("p", 5_000, True)

    assert_no_key(info.value)


@respx.mock
async def test_network_failure_raises_generic_error_without_key() -> None:
    respx.post(URL).mock(side_effect=httpx.ConnectError(f"cannot connect, key {API_KEY}"))

    with pytest.raises(ElevenLabsError) as info:
        await make_client().compose("p", 5_000, True)

    assert_no_key(info.value)
    assert info.value.__cause__ is None
    assert info.value.__suppress_context__


@respx.mock
async def test_empty_success_body_raises() -> None:
    respx.post(URL).mock(return_value=httpx.Response(200, content=b""))

    with pytest.raises(ElevenLabsError):
        await make_client().compose("p", 5_000, True)


def test_config_repr_hides_the_key() -> None:
    config = ElevenLabsConfig(api_key=SecretStr(API_KEY), model_id="music_v2_5")

    assert API_KEY not in repr(config)
    assert API_KEY not in str(config)
    assert API_KEY not in config.model_dump_json()
