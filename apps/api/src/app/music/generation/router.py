"""POST /music/generate: one song prompt in, MP3 bytes out."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.clients.elevenlabs.client import ElevenLabsClient, get_elevenlabs_client
from app.music.generation import service
from app.music.generation.dependencies import get_sleep
from app.music.generation.schemas import GenerateRequest
from app.music.generation.service import Sleep

router = APIRouter(prefix="/generate", tags=["music"])


@router.post(
    "",
    response_class=Response,
    responses={200: {"content": {"audio/mpeg": {}}, "description": "The MP3 file"}},
)
async def generate_track(
    body: GenerateRequest,
    client: Annotated[ElevenLabsClient, Depends(get_elevenlabs_client)],
    sleep: Annotated[Sleep, Depends(get_sleep)],
) -> Response:
    # Typed ElevenLabs errors (429, 422, 502) reach the client through the AppError handler.
    audio = await service.generate_track(
        client, body.prompt, body.length_ms, body.instrumental, sleep=sleep
    )
    return Response(content=audio, media_type="audio/mpeg")
