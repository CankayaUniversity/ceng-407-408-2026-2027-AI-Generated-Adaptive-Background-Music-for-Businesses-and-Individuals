"""Upload checks shared by every endpoint that receives a snapshot."""

from fastapi import HTTPException, UploadFile

MAX_IMAGE_BYTES = 10 * 1024 * 1024


def detect_media_type(data: bytes) -> str | None:
    """Media type from the file's magic numbers (JPEG, PNG, WEBP), else ``None``."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


async def read_image(upload: UploadFile) -> tuple[bytes, str]:
    """Read an uploaded image and return its bytes and real media type, or answer 400/413."""
    # One byte past the limit is enough to detect an oversized file without reading all of it.
    data = await upload.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="The image is larger than 10 MB")
    media_type = detect_media_type(data)
    if media_type is None:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG and WEBP images are accepted")
    return data, media_type
