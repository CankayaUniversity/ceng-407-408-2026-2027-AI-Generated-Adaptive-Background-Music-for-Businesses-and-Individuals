"""Shared fixtures.

Database fixtures create a throwaway ``app_test_<random>`` database on the Postgres from
``docker-compose.yaml``, migrate it with Alembic and drop it afterwards. When Postgres cannot be
reached, tests that need it are skipped with the reason below, never failed and never faked.
"""

import asyncio
import secrets
from collections.abc import AsyncIterator
from pathlib import Path

import httpx
import psycopg
import pytest
import pytest_asyncio
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from psycopg import sql
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.config import BootstrapSettings, SecretNotFoundError, load_bootstrap_settings
from app.core.database import create_engine, get_session
from app.main import create_app

API_ROOT = Path(__file__).resolve().parents[1]
CONNECT_TIMEOUT_SECONDS = 3


def _connect(settings: BootstrapSettings, dbname: str) -> psycopg.Connection:
    return psycopg.connect(
        host=settings.database.host,
        port=settings.database.port,
        user=settings.database.user,
        password=settings.postgres_password.get_secret_value(),
        dbname=dbname,
        connect_timeout=CONNECT_TIMEOUT_SECONDS,
        autocommit=True,
    )


@pytest.fixture(scope="session")
def postgres_settings() -> BootstrapSettings:
    """Bootstrap settings, after checking that Postgres answers; skips the test otherwise."""
    try:
        settings = load_bootstrap_settings()
    except SecretNotFoundError as exc:
        pytest.skip(f"Bootstrap secrets not available: {exc}")
    db = settings.database
    try:
        _connect(settings, db.name).close()
    except psycopg.OperationalError as exc:
        pytest.skip(
            f"Postgres not reachable at {db.host}:{db.port} ({type(exc).__name__}); "
            "start it with: docker compose up -d postgres"
        )
    return settings


@pytest_asyncio.fixture(scope="session")
async def database_url(postgres_settings: BootstrapSettings) -> AsyncIterator[URL]:
    """URL of a freshly migrated throwaway database, dropped at the end of the session."""
    name = f"app_test_{secrets.token_hex(4)}"
    with _connect(postgres_settings, postgres_settings.database.name) as admin:
        admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
    url = postgres_settings.database_url(name)
    try:
        config = Config(str(API_ROOT / "alembic.ini"))
        config.attributes["url"] = url
        # Alembic's env.py runs its own event loop, so keep it off the test loop's thread.
        await asyncio.to_thread(command.upgrade, config, "head")
        yield url
    finally:
        with _connect(postgres_settings, postgres_settings.database.name) as admin:
            admin.execute(
                sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(name))
            )


@pytest_asyncio.fixture(scope="session")
async def engine(
    postgres_settings: BootstrapSettings, database_url: URL
) -> AsyncIterator[AsyncEngine]:
    engine = create_engine(postgres_settings, database_url.database)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    """A session on the throwaway database; everything it did is rolled back afterwards."""
    async with engine.connect() as connection:
        transaction = await connection.begin()
        session = AsyncSession(bind=connection, expire_on_commit=False)
        try:
            yield session
        finally:
            await session.close()
            await transaction.rollback()


@pytest.fixture
def app() -> FastAPI:
    return create_app()


@pytest_asyncio.fixture
async def client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    """HTTP client for the app; needs no database."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
        yield http


@pytest_asyncio.fixture
async def db_client(
    app: FastAPI, engine: AsyncEngine, client: httpx.AsyncClient
) -> AsyncIterator[httpx.AsyncClient]:
    """Like ``client``, with the session dependency pointed at the throwaway database."""
    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)

    async def override_session() -> AsyncIterator[AsyncSession]:
        async with sessionmaker() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    yield client
    app.dependency_overrides.clear()
