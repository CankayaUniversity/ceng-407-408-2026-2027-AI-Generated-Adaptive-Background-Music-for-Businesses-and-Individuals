from typing import Annotated

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.clients.elevenlabs.client import ElevenLabsClient, get_elevenlabs_client
from app.clients.elevenlabs.config import ElevenLabsConfig, get_elevenlabs_config
from app.core.exceptions import SetupRequiredError, register_exception_handlers

ENV_NAMES = ("ELEVENLABS_API_KEY", "ELEVENLABS_MODEL_ID", "ELEVENLABS_OUTPUT_FORMAT")


@pytest.fixture(autouse=True)
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ENV_NAMES:
        monkeypatch.delenv(name, raising=False)


def test_reads_required_and_optional_variables(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ELEVENLABS_API_KEY", "key-123")
    monkeypatch.setenv("ELEVENLABS_MODEL_ID", "music_v2_5")
    monkeypatch.setenv("ELEVENLABS_OUTPUT_FORMAT", "mp3_44100_128")

    config = get_elevenlabs_config()

    assert config.api_key.get_secret_value() == "key-123"
    assert config.model_id == "music_v2_5"
    assert config.output_format == "mp3_44100_128"


def test_output_format_is_optional(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ELEVENLABS_API_KEY", "key-123")
    monkeypatch.setenv("ELEVENLABS_MODEL_ID", "music_v2_5")
    monkeypatch.setenv("ELEVENLABS_OUTPUT_FORMAT", "  ")

    assert get_elevenlabs_config().output_format is None


def test_both_missing_names_both_variables() -> None:
    with pytest.raises(SetupRequiredError) as info:
        get_elevenlabs_config()

    assert "ELEVENLABS_API_KEY" in info.value.message
    assert "ELEVENLABS_MODEL_ID" in info.value.message


@pytest.mark.parametrize(
    ("present", "missing"),
    [
        ("ELEVENLABS_API_KEY", "ELEVENLABS_MODEL_ID"),
        ("ELEVENLABS_MODEL_ID", "ELEVENLABS_API_KEY"),
    ],
)
def test_one_missing_names_only_that_variable(
    monkeypatch: pytest.MonkeyPatch, present: str, missing: str
) -> None:
    monkeypatch.setenv(present, "value")

    with pytest.raises(SetupRequiredError) as info:
        get_elevenlabs_config()

    assert missing in info.value.message
    assert present not in info.value.message


def test_empty_required_variable_counts_as_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ELEVENLABS_API_KEY", "")
    monkeypatch.setenv("ELEVENLABS_MODEL_ID", "music_v2_5")

    with pytest.raises(SetupRequiredError, match="ELEVENLABS_API_KEY"):
        get_elevenlabs_config()


def test_client_dependency_builds_client_from_overridden_config() -> None:
    app = FastAPI()
    register_exception_handlers(app)
    seen: list[ElevenLabsClient] = []

    @app.get("/probe")
    def probe(
        client: Annotated[ElevenLabsClient, Depends(get_elevenlabs_client)],
    ) -> dict[str, bool]:
        seen.append(client)
        return {"ok": True}

    app.dependency_overrides[get_elevenlabs_config] = lambda: ElevenLabsConfig.model_validate(
        {"api_key": "key-123", "model_id": "music_v2_5"}
    )

    response = TestClient(app).get("/probe")

    assert response.status_code == 200
    assert isinstance(seen[0], ElevenLabsClient)


def test_unconfigured_dependency_returns_setup_required_over_http() -> None:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/probe")
    def probe(
        client: Annotated[ElevenLabsClient, Depends(get_elevenlabs_client)],
    ) -> dict[str, bool]:
        return {"ok": True}

    response = TestClient(app).get("/probe")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "setup_required"
