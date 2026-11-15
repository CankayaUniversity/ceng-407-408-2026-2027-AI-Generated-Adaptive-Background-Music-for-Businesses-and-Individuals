"""Mounts the music features under ``/music``."""

from fastapi import APIRouter

from app.music.generation.router import router as generation_router
from app.music.prompting.router import router as prompting_router

router = APIRouter(prefix="/music")
router.include_router(prompting_router)
router.include_router(generation_router)
