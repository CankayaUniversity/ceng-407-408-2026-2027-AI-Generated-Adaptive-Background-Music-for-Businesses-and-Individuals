"""POST /music/prompts: a mood in, a plan of varied song prompts out."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.clients.llm.client import LLMClient, get_llm_client
from app.music.prompting import service
from app.music.prompting.schemas import PromptPlan, PromptPlanRequest

router = APIRouter(prefix="/prompts", tags=["music"])


@router.post("")
async def plan_song_prompts(
    body: PromptPlanRequest,
    llm: Annotated[LLMClient, Depends(get_llm_client)],
) -> PromptPlan:
    return await service.plan_prompts(llm, body.mood, body.summary, body.tags, body.count)
