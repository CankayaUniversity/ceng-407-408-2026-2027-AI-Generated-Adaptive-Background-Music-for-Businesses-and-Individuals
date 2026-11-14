"""Bootstrap configuration: only what the app needs before it can reach the database.

Everything else (providers, models, API keys, limits, plans) is stored encrypted in Postgres and
edited by an admin in the web app. There is no ``.env`` file.

Database connection (non-secret, environment variables with local defaults that match
``docker-compose.yaml``):

* ``APP_DB_HOST``: Postgres host, default ``127.0.0.1``
* ``APP_DB_PORT``: Postgres port, default ``5432``
* ``APP_DB_USER``: Postgres user, default ``music``
* ``APP_DB_NAME``: Postgres database name, default ``music``

Secrets are read from files named exactly like the Docker secrets, first match wins:

1. the directory in ``APP_SECRETS_DIR``, when that variable is set;
2. ``/run/secrets/`` (Docker secrets in every deployed environment);
3. the repository's git-ignored ``secrets/`` folder (created by ``infra/init-secrets.sh``).

The two secret files are ``postgres_password`` and ``app_encryption_keys``. When a file is not
found anywhere, CI and similar environments without secret files may provide the value through the
environment instead: ``POSTGRES_PASSWORD`` and ``APP_ENCRYPTION_KEYS``. A file always wins over
the environment variable. Secret values are ``SecretStr``: never log or return them.
"""

import os
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

DOCKER_SECRETS_DIR = Path("/run/secrets")
# apps/api/src/app/core/config.py -> repository root is five levels above this folder.
REPO_SECRETS_DIR = Path(__file__).resolve().parents[5] / "secrets"


class SecretNotFoundError(RuntimeError):
    """A required bootstrap secret has no file and no environment fallback."""


class DatabaseSettings(BaseSettings):
    """Non-secret connection details, read from ``APP_DB_*`` environment variables."""

    model_config = SettingsConfigDict(env_prefix="APP_DB_")

    host: str = "127.0.0.1"
    port: int = 5432
    user: str = "music"
    name: str = "music"


class BootstrapSettings(BaseModel):
    """Everything needed to connect to Postgres and decrypt stored secrets."""

    database: DatabaseSettings
    postgres_password: SecretStr
    app_encryption_keys: SecretStr

    def database_url(self, database: str | None = None) -> URL:
        """SQLAlchemy URL for the psycopg 3 driver; ``database`` overrides the configured name."""
        return URL.create(
            "postgresql+psycopg",
            username=self.database.user,
            password=self.postgres_password.get_secret_value(),
            host=self.database.host,
            port=self.database.port,
            database=database or self.database.name,
        )

    def secret_values(self) -> list[SecretStr]:
        """Every secret in these settings, for the log redaction filter."""
        return [self.postgres_password, self.app_encryption_keys]


def secret_search_dirs() -> list[Path]:
    """Directories searched for secret files, in priority order."""
    override = os.environ.get("APP_SECRETS_DIR")
    dirs = [Path(override)] if override else []
    return [*dirs, DOCKER_SECRETS_DIR, REPO_SECRETS_DIR]


def read_secret(name: str, env_fallback: str) -> SecretStr:
    """Read secret ``name`` from the first directory that has it, else from ``env_fallback``."""
    for directory in secret_search_dirs():
        path = directory / name
        if path.is_file():
            return SecretStr(path.read_text(encoding="utf-8").strip())
    value = os.environ.get(env_fallback)
    if value:
        return SecretStr(value)
    searched = ", ".join(str(d) for d in secret_search_dirs())
    raise SecretNotFoundError(
        f"Secret '{name}' not found in [{searched}] and environment variable "
        f"{env_fallback} is not set. Run infra/init-secrets.sh."
    )


def load_bootstrap_settings() -> BootstrapSettings:
    """Build the bootstrap settings from the environment and the secret files."""
    return BootstrapSettings(
        database=DatabaseSettings(),
        postgres_password=read_secret("postgres_password", "POSTGRES_PASSWORD"),
        app_encryption_keys=read_secret("app_encryption_keys", "APP_ENCRYPTION_KEYS"),
    )


@lru_cache
def get_bootstrap_settings() -> BootstrapSettings:
    """Cached bootstrap settings; secrets are read on first use, not at import time."""
    return load_bootstrap_settings()
