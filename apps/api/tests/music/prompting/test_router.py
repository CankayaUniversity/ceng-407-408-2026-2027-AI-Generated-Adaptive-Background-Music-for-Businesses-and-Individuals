import httpx
import pytest
from fastapi import FastAPI

from app.clients.llm.client import get_llm_client
from tests.music.prompting.fakes import ScriptedLLM, plan_json, plan_with

URL = "/music/prompts"
MOOD = {"valence": 0.6, "texture": -0.7, "energy": -0.4}


def install(app: FastAPI, replies: list[str]) -> ScriptedLLM:
    llm = ScriptedLLM(replies)
    app.dependency_overrides[get_llm_client] = lambda: llm
    return llm


def body(**overrides: object) -> dict[str, object]:
    return {"mood": MOOD, "summary": "A quiet sunny kitchen.", "tags": ["calm"]} | overrides


@pytest.mark.parametrize("count", [5, 25])
async def test_counts_at_the_limits_are_accepted(
    app: FastAPI, client: httpx.AsyncClient, count: int
) -> None:
    llm = install(app, [plan_json(count)])

    response = await client.post(URL, json=body(count=count))

    assert response.status_code == 200
    prompts = response.json()["prompts"]
    assert len(prompts) == count
    assert set(prompts[0]) == {"title", "prompt", "length_ms", "instrumental"}
    assert f"{count} songs" in llm.user_text()


@pytest.mark.parametrize("count", [4, 26, 0, -5])
async def test_counts_outside_the_limits_are_rejected_with_422(
    app: FastAPI, client: httpx.AsyncClient, count: int
) -> None:
    llm = install(app, [])

    response = await client.post(URL, json=body(count=count))

    assert response.status_code == 422
    assert llm.calls == []


async def test_count_defaults_to_five(app: FastAPI, client: httpx.AsyncClient) -> None:
    llm = install(app, [plan_json(5)])

    response = await client.post(URL, json=body())

    assert response.status_code == 200
    assert len(response.json()["prompts"]) == 5
    assert "5 songs" in llm.user_text()


async def test_mood_values_reach_the_llm(app: FastAPI, client: httpx.AsyncClient) -> None:
    llm = install(app, [plan_json(5)])

    await client.post(URL, json=body())

    user = llm.user_text()
    for value in ("+0.60", "-0.70", "-0.40"):
        assert value in user


@pytest.mark.parametrize(
    "payload",
    [
        body(mood={"valence": 1.5, "texture": 0, "energy": 0}),
        body(mood={"valence": 0, "texture": 0}),
        {"summary": "x", "tags": []},
        {"mood": MOOD, "tags": []},
        body(tags=["", "ok"]),
    ],
)
async def test_invalid_bodies_are_rejected_with_422(
    app: FastAPI, client: httpx.AsyncClient, payload: dict[str, object]
) -> None:
    llm = install(app, [])

    response = await client.post(URL, json=payload)

    assert response.status_code == 422
    assert llm.calls == []


async def test_artist_reference_is_repaired_through_the_endpoint(
    app: FastAPI, client: httpx.AsyncClient
) -> None:
    offending = plan_with(5, 2, prompt="Dreamy synths in the style of Daft Punk")
    llm = install(app, [offending, plan_json(5)])

    response = await client.post(URL, json=body())

    assert response.status_code == 200
    assert len(llm.calls) == 2
    assert "daft punk" not in response.text.lower()


async def test_unrepairable_plan_gives_502(app: FastAPI, client: httpx.AsyncClient) -> None:
    duplicated = plan_with(5, 1, title="Morning Light 0")
    install(app, [duplicated, duplicated])

    response = await client.post(URL, json=body())

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "llm_invalid_response"


async def test_missing_llm_environment_gives_503(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    for name in ("LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"):
        monkeypatch.delenv(name, raising=False)

    response = await client.post(URL, json=body())

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "setup_required"
