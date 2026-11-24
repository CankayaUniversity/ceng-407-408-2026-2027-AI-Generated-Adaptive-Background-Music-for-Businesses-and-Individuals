"""One-page demo of the pipeline: snapshot -> mood -> prompts -> track -> player.

Step 1 (this file today): serve the page and receive the captured webcam frame.
"""

from pathlib import Path

from fastapi import FastAPI, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from demo.images import read_image

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="Adaptive music demo")


class SnapshotInfo(BaseModel):
    size_bytes: int
    media_type: str


@app.get("/", include_in_schema=False)
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.post("/api/snapshot")
async def snapshot(image: UploadFile) -> SnapshotInfo:
    """Step 1: check the captured frame arrived intact. Step 2 sends it to the LLM instead."""
    data, media_type = await read_image(image)
    return SnapshotInfo(size_bytes=len(data), media_type=media_type)
