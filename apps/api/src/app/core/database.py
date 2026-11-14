"""Async SQLAlchemy engine and session factory built from the bootstrap settings."""

from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import BootstrapSettings, get_bootstrap_settings


class Base(DeclarativeBase):
    """Declarative base for every table."""


def create_engine(settings: BootstrapSettings, database: str | None = None) -> AsyncEngine:
    """Create an async engine (psycopg 3); ``database`` overrides the configured name."""
    return create_async_engine(settings.database_url(database), pool_pre_ping=True)


@lru_cache
def get_engine() -> AsyncEngine:
    """The process-wide engine, created on first use."""
    return create_engine(get_bootstrap_settings())


@lru_cache
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    """The process-wide session factory."""
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency yielding one session per request."""
    async with get_sessionmaker()() as session:
        yield session


async def dispose_engine() -> None:
    """Close the pool if an engine was created; call on shutdown."""
    if get_engine.cache_info().currsize:
        await get_engine().dispose()
        get_engine.cache_clear()
        get_sessionmaker.cache_clear()
