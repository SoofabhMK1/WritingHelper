from fastapi import APIRouter

from app.api.v1 import (
    ai,
    ai_logs,
    ai_profiles,
    ai_prompt_templates,
    backup,
    chapters,
    characters,
    events,
    foreshadowing,
    prompt_assemblies,
    prompt_fragments,
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
api_router.include_router(ai_profiles.router)
api_router.include_router(ai_prompt_templates.router)
api_router.include_router(ai_logs.router)
api_router.include_router(backup.router)
api_router.include_router(prompt_fragments.router)
api_router.include_router(prompt_assemblies.router)