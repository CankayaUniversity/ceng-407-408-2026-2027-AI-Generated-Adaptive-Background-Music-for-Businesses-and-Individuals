"""One-page demo of the pipeline: snapshot -> mood -> prompts -> track -> player.

Step 1 serves the page and receives the captured webcam frame; step 2 turns it into a mood.
"""

from pathlib import Path

from fastapi import FastAPI, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from demo.images import read_image
from demo.llm import ask_json
from demo.mood import analyze_mood
from demo.planning import Mood

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
    """Step 1: check the captured frame arrived intact. The page now posts to /api/mood instead."""
    data, media_type = await read_image(image)
    return SnapshotInfo(size_bytes=len(data), media_type=media_type)


@app.post("/api/mood")
async def mood(image: UploadFile) -> Mood:
    """Step 2: the mood of the photographed place, as three axes, a summary and tags."""
    data, media_type = await read_image(image)
    return await analyze_mood(data, media_type, ask_json)
