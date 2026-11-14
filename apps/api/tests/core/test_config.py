from pathlib import Path

import pytest

from app.core import config
from app.core.config import SecretNotFoundError, load_bootstrap_settings, read_secret

ENV_NAMES = (
    "APP_DB_HOST",
    "APP_DB_PORT",
    "APP_DB_USER",
    "APP_DB_NAME",
    "APP_SECRETS_DIR",
    "POSTGRES_PASSWORD",
    "APP_ENCRYPTION_KEYS",
)


@pytest.fixture(autouse=True)
def isolated_config(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """No real secret folders and no ambient environment: each test sets what it needs."""
    for name in ENV_NAMES:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(config, "DOCKER_SECRETS_DIR", tmp_path / "no-docker-secrets")
    monkeypatch.setattr(config, "REPO_SECRETS_DIR", tmp_path / "no-repo-secrets")


def write_secrets(directory: Path, password: str, keys: str) -> None:
    directory.mkdir(exist_ok=True)
    (directory / "postgres_password").write_text(f"{password}\n", encoding="utf-8")
    (directory / "app_encryption_keys").write_text(keys, encoding="utf-8")


def test_secrets_are_read_from_files_and_stripped(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    write_secrets(tmp_path / "s", "pw-from-file", "key-from-file")
    monkeypatch.setenv("APP_SECRETS_DIR", str(tmp_path / "s"))

    settings = load_bootstrap_settings()

    assert settings.postgres_password.get_secret_value() == "pw-from-file"
    assert settings.app_encryption_keys.get_secret_value() == "key-from-file"


def test_repo_secrets_dir_is_used_without_an_override(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    write_secrets(tmp_path / "repo", "repo-pw", "repo-key")
    monkeypatch.setattr(config, "REPO_SECRETS_DIR", tmp_path / "repo")

    assert read_secret("postgres_password", "POSTGRES_PASSWORD").get_secret_value() == "repo-pw"


def test_override_dir_beats_docker_and_repo_dirs(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    write_secrets(tmp_path / "override", "override-pw", "k")
    write_secrets(tmp_path / "docker", "docker-pw", "k")
    write_secrets(tmp_path / "repo", "repo-pw", "k")
    monkeypatch.setenv("APP_SECRETS_DIR", str(tmp_path / "override"))
    monkeypatch.setattr(config, "DOCKER_SECRETS_DIR", tmp_path / "docker")
    monkeypatch.setattr(config, "REPO_SECRETS_DIR", tmp_path / "repo")

    assert read_secret("postgres_password", "POSTGRES_PASSWORD").get_secret_value() == "override-pw"


def test_docker_secrets_dir_beats_repo_dir(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    write_secrets(tmp_path / "docker", "docker-pw", "k")
    write_secrets(tmp_path / "repo", "repo-pw", "k")
    monkeypatch.setattr(config, "DOCKER_SECRETS_DIR", tmp_path / "docker")
    monkeypatch.setattr(config, "REPO_SECRETS_DIR", tmp_path / "repo")

    assert read_secret("postgres_password", "POSTGRES_PASSWORD").get_secret_value() == "docker-pw"


def test_environment_is_the_fallback_when_no_file_exists(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("POSTGRES_PASSWORD", "pw-from-env")
    monkeypatch.setenv("APP_ENCRYPTION_KEYS", "key-from-env")

    settings = load_bootstrap_settings()

    assert settings.postgres_password.get_secret_value() == "pw-from-env"
    assert settings.app_encryption_keys.get_secret_value() == "key-from-env"


def test_file_beats_environment(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    write_secrets(tmp_path / "s", "pw-from-file", "k")
    monkeypatch.setenv("APP_SECRETS_DIR", str(tmp_path / "s"))
    monkeypatch.setenv("POSTGRES_PASSWORD", "pw-from-env")

    assert (
        read_secret("postgres_password", "POSTGRES_PASSWORD").get_secret_value() == "pw-from-file"
    )


def test_missing_secret_raises_and_names_the_variable() -> None:
    with pytest.raises(SecretNotFoundError, match="POSTGRES_PASSWORD"):
        read_secret("postgres_password", "POSTGRES_PASSWORD")


def test_database_defaults_match_docker_compose(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("POSTGRES_PASSWORD", "pw")
    monkeypatch.setenv("APP_ENCRYPTION_KEYS", "k")

    db = load_bootstrap_settings().database

    assert (db.host, db.port, db.user, db.name) == ("127.0.0.1", 5432, "music", "music")


def test_database_settings_come_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("POSTGRES_PASSWORD", "pw")
    monkeypatch.setenv("APP_ENCRYPTION_KEYS", "k")
    monkeypatch.setenv("APP_DB_HOST", "postgres")
    monkeypatch.setenv("APP_DB_PORT", "6543")
    monkeypatch.setenv("APP_DB_USER", "alice")
    monkeypatch.setenv("APP_DB_NAME", "tracks")

    url = load_bootstrap_settings().database_url()

    assert url.drivername == "postgresql+psycopg"
    assert (url.host, url.port, url.username, url.database) == ("postgres", 6543, "alice", "tracks")
    assert url.password == "pw"


def test_database_url_can_target_another_database(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("POSTGRES_PASSWORD", "pw")
    monkeypatch.setenv("APP_ENCRYPTION_KEYS", "k")

    assert load_bootstrap_settings().database_url("app_test_1").database == "app_test_1"


def test_secrets_never_appear_in_repr_or_str(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("POSTGRES_PASSWORD", "super-secret-pw")
    monkeypatch.setenv("APP_ENCRYPTION_KEYS", "super-secret-key")

    settings = load_bootstrap_settings()

    for text in (repr(settings), str(settings), settings.model_dump_json()):
        assert "super-secret" not in text
