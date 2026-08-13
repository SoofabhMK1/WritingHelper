import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import settings
from app.database import SessionLocal
from app.services.ai_profiles import ensure_legacy_migrated

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("xiaoshuo")

app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
    version="0.1.0",
    description=(
        "AI-assisted Chinese novel writing system. Single-user, local-first. "
        "See AGENTS.md for conventions and README.md for feature overview."
    ),
    contact={"name": "Maintainer"},
    license_info={"name": "MIT"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
def _run_legacy_migration() -> None:
    """Lift any leftover ``app_settings`` ai.* keys into a default profile.

    Runs once at process startup; the ``resolve_profile`` hot path is
    then safe to assume the migration has already happened.
    """
    logger.info("startup: running legacy AI settings migration check")
    db = SessionLocal()
    try:
        ensure_legacy_migrated(db)
    finally:
        db.close()


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "app": settings.app_name}


@app.get("/", tags=["meta"])
def root():
    return {
        "app": settings.app_name,
        "docs": "/docs",
        "api": "/api/v1",
    }