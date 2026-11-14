"""Tests that need the compose Postgres; skipped with a reason when it is not running."""

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def test_baseline_migration_is_applied(db_session: AsyncSession) -> None:
    result = await db_session.execute(text("SELECT version_num FROM alembic_version"))

    assert result.scalar_one() == "0001"


async def test_session_runs_queries(db_session: AsyncSession) -> None:
    result = await db_session.execute(text("SELECT 1"))

    assert result.scalar_one() == 1


async def test_app_client_works_with_the_test_database(db_client: httpx.AsyncClient) -> None:
    response = await db_client.get("/healthz")

    assert response.status_code == 200
