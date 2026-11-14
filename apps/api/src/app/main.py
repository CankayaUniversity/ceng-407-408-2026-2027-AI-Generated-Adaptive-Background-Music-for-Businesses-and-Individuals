"""Creates the FastAPI app; area routers are included here as they are added."""

from fastapi import FastAPI

from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.core.schemas import HealthResponse


def create_app() -> FastAPI:
    setup_logging()
    app = FastAPI(title="Adaptive Music API")
    register_exception_handlers(app)

    @app.get("/healthz", tags=["health"])
    async def healthz() -> HealthResponse:
        return HealthResponse(status="ok")

    return app


app = create_app()
