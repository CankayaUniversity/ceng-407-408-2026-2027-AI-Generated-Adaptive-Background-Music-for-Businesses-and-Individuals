import json
from collections.abc import Sequence

import httpx
import pytest
import respx
from fastapi import FastAPI

from app.clients.elevenlabs.client import get_elevenlabs_client
from app.clients.elevenlabs.config import get_elevenlabs_config
from app.clients.elevenlabs.exceptions import (
    ElevenLabsAuthError,
    ElevenLabsBadPromptError,
    ElevenLabsRateLimitError,
)
from app.music.generation.dependencies import get_sleep
from tests.music.generation.fakes import API_KEY, MP3, FakeElevenLabs, RecordingSleep, make_config

URL = "/music/generate"
UPSTREAM_URL = "https://api.elevenlabs.io/v1/music"
BODY = {"prompt": "Calm ambient piano with soft pads", "length_ms": 30_000}


def install_fake(
    app: FastAPI, outcomes: Sequence[bytes | Exception]
) -> tuple[FakeElevenLabs, RecordingSleep]:
    fake, sleep = FakeElevenLabs(outcomes), RecordingSleep()
    app.dependency_overrides[get_elevenlabs_client] = lambda: fake
    app.dependency_overrides[get_sleep] = lambda: sleep
    return fake, sleep


def install_real_client(app: FastAPI) -> RecordingSleep:
    """Keep the real client class (its HTTP calls are mocked with respx); only config and sleep."""
    sleep = RecordingSleep()
    app.dependency_overrides[get_elevenlabs_config] = make_config
    app.dependency_overrides[get_sleep] = lambda: sleep
    return sleep


async def test_success_returns_the_mp3_bytes(app: FastAPI, client: httpx.AsyncClient) -> None:
    fake, _ = install_fake(app, [MP3])

    response = await client.post(URL, json=BODY)

    assert response.status_code == 200
    assert response.content == MP3
    assert response.headers["content-type"] == "audio/mpeg"
    (call,) = fake.calls
    assert (call.prompt, call.length_ms, call.instrumental) == (BODY["prompt"], 30_000, True)


async def test_instrumental_false_is_passed_on(app: FastAPI, client: httpx.AsyncClient) -> None:
    fake, _ = install_fake(app, [MP3])

    await client.post(URL, json=BODY | {"instrumental": False})

    assert fake.calls[0].instrumental is False


@respx.mock
async def test_success_through_the_real_client_class(
    app: FastAPI, client: httpx.AsyncClient
) -> None:
    install_real_client(app)
    route = respx.post(UPSTREAM_URL).mock(return_value=httpx.Response(200, content=MP3))

    response = await client.post(URL, json=BODY)

    assert response.status_code == 200
    assert response.content == MP3
    assert response.headers["content-type"] == "audio/mpeg"
    upstream = route.calls.last.request
    assert json.loads(upstream.content) == {
        "prompt": BODY["prompt"],
        "music_length_ms": 30_000,
        "model_id": "music_v2_5",
        "force_instrumental": True,
    }
    assert upstream.headers["xi-api-key"] == API_KEY


async def test_rate_limit_is_retried_and_succeeds(app: FastAPI, client: httpx.AsyncClient) -> None:
    fake, sleep = install_fake(app, [ElevenLabsRateLimitError("slow down"), MP3])

    response = await client.post(URL, json=BODY)

    assert response.status_code == 200
    assert response.content == MP3
    assert len(fake.calls) == 2
    assert sleep.delays == [1.0]


@respx.mock
async def test_retry_after_header_is_honoured_through_the_real_client(
    app: FastAPI, client: httpx.AsyncClient
) -> None:
    sleep = install_real_client(app)
    route = respx.post(UPSTREAM_URL).mock(
        side_effect=[
            httpx.Response(429, headers={"retry-after": "4"}, json={"detail": "Too many"}),
            httpx.Response(200, content=MP3),
        ]
    )

    response = await client.post(URL, json=BODY)

    assert response.status_code == 200
    assert route.call_count == 2
    assert sleep.delays == [4.0]


async def test_rate_limit_three_times_returns_429(app: FastAPI, client: httpx.AsyncClient) -> None:
    fake, sleep = install_fake(app, [ElevenLabsRateLimitError("limit")] * 3 + [MP3])

    response = await client.post(URL, json=BODY)

    assert response.status_code == 429
    assert response.json()["error"]["code"] == "elevenlabs_rate_limited"
    assert len(fake.calls) == 3
    assert sleep.delays == [1.0, 2.0]


async def test_bad_prompt_is_retried_once_with_the_suggestion(
    app: FastAPI, client: httpx.AsyncClient
) -> None:
    refusal = ElevenLabsBadPromptError("no artists", prompt_suggestion="Warm acoustic folk")
    fake, _ = install_fake(app, [refusal, MP3])

    response = await client.post(URL, json=BODY | {"prompt": "A song like the Beatles"})

    assert response.status_code == 200
    assert response.content == MP3
    assert [call.prompt for call in fake.calls] == ["A song like the Beatles", "Warm acoustic folk"]


async def test_bad_prompt_twice_returns_422(app: FastAPI, client: httpx.AsyncClient) -> None:
    fake, _ = install_fake(
        app,
        [
            ElevenLabsBadPromptError("no", prompt_suggestion="First fix"),
            ElevenLabsBadPromptError("still no", prompt_suggestion="Second fix"),
            MP3,
        ],
    )

    response = await client.post(URL, json=BODY)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "elevenlabs_bad_prompt"
    assert len(fake.calls) == 2


@respx.mock
async def test_bad_prompt_twice_through_the_real_client_returns_422(
    app: FastAPI, client: httpx.AsyncClient
) -> None:
    install_real_client(app)
    refusal = httpx.Response(
        422,
        json={
            "detail": {
                "status": "bad_prompt",
                "message": "The prompt mentions a protected artist.",
                "data": {"prompt_suggestion": "Warm acoustic folk"},
            }
        },
    )
    route = respx.post(UPSTREAM_URL).mock(return_value=refusal)

    response = await client.post(URL, json=BODY | {"prompt": "A song like the Beatles"})

    assert response.status_code == 422
    assert route.call_count == 2
    assert json.loads(route.calls[1].request.content)["prompt"] == "Warm acoustic folk"


async def test_auth_error_returns_502_without_the_key(
    app: FastAPI, client: httpx.AsyncClient
) -> None:
    fake, sleep = install_fake(app, [ElevenLabsAuthError("Invalid API key"), MP3])

    response = await client.post(URL, json=BODY)

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "elevenlabs_auth_error"
    assert API_KEY not in response.text
    assert len(fake.calls) == 1
    assert sleep.delays == []


@respx.mock
async def test_auth_error_never_echoes_the_key_even_if_the_provider_does(
    app: FastAPI, client: httpx.AsyncClient
) -> None:
    install_real_client(app)
    respx.post(UPSTREAM_URL).mock(
        return_value=httpx.Response(401, json={"detail": f"Invalid key {API_KEY}"})
    )

    response = await client.post(URL, json=BODY)

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "elevenlabs_auth_error"
    assert API_KEY not in response.text


@respx.mock
async def test_other_upstream_errors_are_mapped_through_the_error_handler(
    app: FastAPI, client: httpx.AsyncClient
) -> None:
    install_real_client(app)
    respx.post(UPSTREAM_URL).mock(return_value=httpx.Response(500, text="oops"))

    response = await client.post(URL, json=BODY)

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "elevenlabs_error"


@pytest.mark.parametrize("length_ms", [2_999, 600_001, 0, -1])
async def test_length_outside_the_range_returns_422(
    app: FastAPI, client: httpx.AsyncClient, length_ms: int
) -> None:
    fake, _ = install_fake(app, [MP3])

    response = await client.post(URL, json=BODY | {"length_ms": length_ms})

    assert response.status_code == 422
    assert fake.calls == []


@pytest.mark.parametrize("length_ms", [3_000, 600_000])
async def test_length_at_the_limits_is_accepted(
    app: FastAPI, client: httpx.AsyncClient, length_ms: int
) -> None:
    fake, _ = install_fake(app, [MP3])

    response = await client.post(URL, json=BODY | {"length_ms": length_ms})

    assert response.status_code == 200
    assert fake.calls[0].length_ms == length_ms


@pytest.mark.parametrize(
    "payload",
    [
        {"length_ms": 30_000},
        {"prompt": "", "length_ms": 30_000},
        {"prompt": "x" * 2_001, "length_ms": 30_000},
        {"prompt": "x"},
        {"prompt": "x", "length_ms": 30_000, "instrumental": "maybe"},
    ],
)
async def test_invalid_bodies_return_422(
    app: FastAPI, client: httpx.AsyncClient, payload: dict[str, object]
) -> None:
    fake, _ = install_fake(app, [MP3])

    response = await client.post(URL, json=payload)

    assert response.status_code == 422
    assert fake.calls == []


async def test_missing_elevenlabs_environment_gives_503(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    for name in ("ELEVENLABS_API_KEY", "ELEVENLABS_MODEL_ID"):
        monkeypatch.delenv(name, raising=False)

    response = await client.post(URL, json=BODY)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "setup_required"
