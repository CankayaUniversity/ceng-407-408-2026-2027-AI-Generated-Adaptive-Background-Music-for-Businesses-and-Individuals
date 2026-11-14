"""Errors for rejected uploads."""

from app.core.exceptions import AppError


class ImageTooLargeError(AppError):
    status_code = 413
    code = "image_too_large"


class UnsupportedImageError(AppError):
    status_code = 415
    code = "unsupported_image_type"
