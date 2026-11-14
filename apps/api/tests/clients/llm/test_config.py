import pytest
from pydantic import SecretStr, ValidationError

from app.clients.llm.config import LLMConfig, get_llm_config
from app.core.exceptions import SetupRequiredError

ALL_VARS = (
    "LLM_BASE_URL",
    "LLM_API_KEY",
    "LLM_MODEL",
    "LLM_JSON_MODE",
    "LLM_REASONING_EFFORT",
    "LLM_EXTRA_BODY",
)


@pytest.fixture(autouse=True)
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ALL_VARS:
        monkeypatch.delenv(name, raising=False)


def set_required(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_BASE_URL", "https://llm.test/v1")
    monkeypatch.setenv("LLM_API_KEY", "sk-secret")
    monkeypatch.setenv("LLM_MODEL", "some-model")


def test_reads_required_variables_with_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    set_required(monkeypatch)

    config = get_llm_config()

    assert config.base_url == "https://llm.test/v1"
    assert config.api_key.get_secret_value() == "sk-secret"
    assert config.model == "some-model"
    assert config.json_mode == "json_schema"
    assert config.reasoning_effort is None
    assert config.extra_body == {}


def test_reads_optional_variables(monkeypatch: pytest.MonkeyPatch) -> None:
    set_required(monkeypatch)
    monkeypatch.setenv("LLM_JSON_MODE", "json_object")
    monkeypatch.setenv("LLM_REASONING_EFFORT", "low")
    monkeypatch.setenv("LLM_EXTRA_BODY", '{"thinking": {"type": "disabled"}}')

    config = get_llm_config()

    assert config.json_mode == "json_object"
    assert config.reasoning_effort == "low"
    assert config.extra_body == {"thinking": {"type": "disabled"}}


def test_missing_variables_are_named(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_MODEL", "some-model")

    with pytest.raises(SetupRequiredError) as caught:
        get_llm_config()

    assert "LLM_BASE_URL" in caught.value.message
    assert "LLM_API_KEY" in caught.value.message
    assert "LLM_MODEL" not in caught.value.message


def test_blank_required_variable_counts_as_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    set_required(monkeypatch)
    monkeypatch.setenv("LLM_API_KEY", "   ")

    with pytest.raises(SetupRequiredError, match="LLM_API_KEY"):
        get_llm_config()


def test_invalid_json_mode_is_a_setup_error(monkeypatch: pytest.MonkeyPatch) -> None:
    set_required(monkeypatch)
    monkeypatch.setenv("LLM_JSON_MODE", "yaml")

    with pytest.raises(SetupRequiredError, match="json_mode"):
        get_llm_config()


def test_invalid_extra_body_is_a_setup_error(monkeypatch: pytest.MonkeyPatch) -> None:
    set_required(monkeypatch)
    monkeypatch.setenv("LLM_EXTRA_BODY", "not json")

    with pytest.raises(SetupRequiredError, match="LLM_EXTRA_BODY"):
        get_llm_config()


def test_extra_body_with_managed_key_is_a_setup_error_without_leaking_the_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    set_required(monkeypatch)
    monkeypatch.setenv("LLM_EXTRA_BODY", '{"model": "other"}')

    with pytest.raises(SetupRequiredError, match="model") as caught:
        get_llm_config()

    assert "sk-secret" not in caught.value.message


def test_api_key_is_not_in_repr() -> None:
    config = LLMConfig(base_url="https://llm.test/v1", api_key=SecretStr("sk-secret"), model="m")

    assert "sk-secret" not in repr(config)
    assert "sk-secret" not in config.model_dump_json()


@pytest.mark.parametrize("key", ["model", "messages", "response_format"])
def test_config_rejects_managed_keys_in_extra_body(key: str) -> None:
    with pytest.raises(ValidationError, match=key):
        LLMConfig(
            base_url="https://llm.test/v1",
            api_key=SecretStr("sk-secret"),
            model="m",
            extra_body={key: "x"},
        )
