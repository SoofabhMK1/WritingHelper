from fastapi import APIRouter

from app.api.v1 import (
    ai,
    backup,
    chapters,
    characters,
    events,
    foreshadowing,
    protagonists,
    settings,
    states,
    volumes,
    works,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(works.router)
api_router.include_router(volumes.router)
api_router.include_router(chapters.router)
api_router.include_router(characters.router)
api_router.include_router(protagonists.router)
api_router.include_router(events.router)
api_router.include_router(states.router)
api_router.include_router(foreshadowing.router)
api_router.include_router(settings.router)
api_router.include_router(ai.router)
api_router.include_router(backup.router)