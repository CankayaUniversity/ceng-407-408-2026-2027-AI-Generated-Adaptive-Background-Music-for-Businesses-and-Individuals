"""Alembic environment using the async engine.

The URL comes from ``config.attributes["url"]`` (tests pass a throwaway database there) and
otherwise from the bootstrap settings.
"""

import asyncio

from alembic import context
from sqlalchemy.engine import URL, Connection
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import get_bootstrap_settings
from app.core.database import Base

config = context.config
target_metadata = Base.metadata


def get_url() -> URL:
    url = config.attributes.get("url")
    if isinstance(url, URL):
        return url
    return get_bootstrap_settings().database_url()


def run_migrations_offline() -> None:
    context.configure(
        url=get_url().render_as_string(hide_password=False),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(get_url())
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
