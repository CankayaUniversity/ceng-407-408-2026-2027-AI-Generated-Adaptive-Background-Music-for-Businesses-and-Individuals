import httpx
import pytest
from fastapi import FastAPI

from app.core.exceptions import AppError, ConflictError, NotFoundError, SetupRequiredError


@pytest.mark.parametrize(
    ("error", "status", "code"),
    [
        (NotFoundError("no such track"), 404, "not_found"),
        (ConflictError("already exists"), 409, "conflict"),
        (SetupRequiredError("configure the LLM"), 503, "setup_required"),
        (AppError("boom"), 500, "internal_error"),
    ],
)
async def test_app_errors_map_to_http_responses(
    app: FastAPI, client: httpx.AsyncClient, error: AppError, status: int, code: str
) -> None:
    @app.get("/boom")
    async def boom() -> None:
        raise error

    response = await client.get("/boom")

    assert response.status_code == status
    assert response.json() == {"error": {"code": code, "message": error.message}}


def test_default_message_comes_from_the_code() -> None:
    assert NotFoundError().message == "not found"
