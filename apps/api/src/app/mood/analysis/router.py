"""POST /mood/analysis: image upload in, mood vector, summary and tags out."""

from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile

from app.clients.llm.client import LLMClient, get_llm_client
from app.mood.analysis import service
from app.mood.analysis.schemas import MoodAnalysis

router = APIRouter(prefix="/analysis", tags=["mood"])


@router.post("")
async def analyze_mood(
    image: UploadFile,
    llm: Annotated[LLMClient, Depends(get_llm_client)],
) -> MoodAnalysis:
    # Read one byte past the limit so an oversized file is detected without loading all of it.
    data = await image.read(service.MAX_IMAGE_BYTES + 1)
    return await service.analyze_image(llm, data)
