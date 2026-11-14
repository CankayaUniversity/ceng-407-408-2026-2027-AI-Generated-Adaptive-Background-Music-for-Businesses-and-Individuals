"""Base application errors and their HTTP mapping."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base class: subclasses set the HTTP status and a stable machine-readable code."""

    status_code: int = 500
    code: str = "internal_error"

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.code.replace("_", " ")
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class SetupRequiredError(AppError):
    """A feature needs a provider the admin has not configured yet."""

    status_code = 503
    code = "setup_required"


async def app_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Render an ``AppError`` as ``{"error": {"code": ..., "message": ...}}``."""
    if not isinstance(exc, AppError):
        raise exc
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
