"""Mounts the mood features under ``/mood``."""

from fastapi import APIRouter

from app.mood.analysis.router import router as analysis_router

router = APIRouter(prefix="/mood")
router.include_router(analysis_router)
