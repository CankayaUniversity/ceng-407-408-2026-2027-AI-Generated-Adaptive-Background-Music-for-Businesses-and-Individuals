"""Creates the FastAPI app; area routers are included here as they are added."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_bootstrap_settings
from app.core.database import dispose_engine
from app.core.exceptions import register_exception_handlers
from app.core.logging import register_secrets, setup_logging
from app.core.schemas import HealthResponse


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    register_secrets(get_bootstrap_settings().secret_values())
    yield
    await dispose_engine()


def create_app() -> FastAPI:
    setup_logging()
    app = FastAPI(title="Adaptive Music API", lifespan=lifespan)
    register_exception_handlers(app)

    @app.get("/healthz", tags=["health"])
    async def healthz() -> HealthResponse:
        return HealthResponse(status="ok")

    return app


app = create_app()
