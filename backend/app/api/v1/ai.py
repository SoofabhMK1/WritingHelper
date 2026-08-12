"""AI routes: outline / chapters / character / event / chat / consistency /
continue / expand.

These endpoints hit the configured LLM and return structured JSON. The
underlying provider is chosen per request via ``app.services.ai_profiles``:
an explicit prompt → profile assignment wins; otherwise the call uses
the default saved profile. If no profile is configured, the call falls
back to environment variables and finally returns 503.

The actual ``(system, user)`` body is rendered by
``app.services.ai_prompt_template.resolve_prompt``, which honours the
per-prompt template binding (a saved ``PromptAssembly``). When no
binding is set, the call falls back to the built-in template in
``app.ai.prompts.PROMPTS``.

Every successful or failed LLM call is captured by the audit log via
``app.services.llm_log.record()`` — see ``_call`` / ``free_chat``.
"""
from __future__ import annotations

import json
import time
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai import client as ai_client
from app.ai import context as ctx
from app.ai import prompts as ai_prompts
from app.ai.prompts import PROMPTS
from app.database import get_db
from app.services import llm_log
from app.services.ai_prompt_template import resolve_prompt
from app.services.ai_profiles import (
    get_default_profile,
    list_assignments,
    list_profiles,
    profile_to_summary,
)
from app.services.prompt_assembly import AssemblyRenderError

router = APIRouter(prefix="/ai", tags=["ai"])


# =============================================================================
# Request / response models
# =============================================================================

class OutlineRequest(BaseModel):
    work_id: int
    volume_count: int = Field(3, ge=1, le=10)
    target_words: Optional[int] = None


class ChaptersRequest(BaseModel):
    work_id: int
    volume_id: int
    target_chapter_count: int = Field(10, ge=1, le=100)


class CharacterRequest(BaseModel):
    work_id: int
    role: str = "support"
    extra_hint: Optional[str] = None


class EventRequest(BaseModel):
    work_id: int
    count: int = Field(5, ge=1, le=20)
    current_summary: Optional[str] = None


class ConsistencyRequest(BaseModel):
    work_id: int
    new_content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    work_id: Optional[int] = None
    question: str = Field(..., min_length=1)


class ContinueRequest(BaseModel):
    work_id: int
    chapter_id: int
    target_chars: int = Field(800, ge=50, le=4000)
    tail_chars: int = Field(1000, ge=100, le=4000)


class ExpandRequest(BaseModel):
    work_id: int
    selection: str = Field(..., min_length=10)
    target_chars: int = Field(400, ge=50, le=2000)


# -----------------------------------------------------------------------------
# Prompt catalog (read-only)
# -----------------------------------------------------------------------------

class PromptSummary(BaseModel):
    name: str
    json_mode: bool
    temperature: float


class PromptDetail(PromptSummary):
    system: str
    user_template: str


# =============================================================================
# Helpers
# =============================================================================

def _parse_json(text: str) -> Any:
    """Best-effort JSON extraction. Strips ```json fences."""
    s = text.strip()
    if s.startswith("```"):
        # remove leading fence
        first_nl = s.find("\n")
        if first_nl != -1:
            s = s[first_nl + 1 :]
        if s.endswith("```"):
            s = s[:-3]
    try:
        return json.loads(s)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"AI 返回的不是合法 JSON: {e}") from e


def _call(
    db: Session,
    prompt_name: str,
    variables: dict[str, Any],
    json_mode: bool = True,
    *,
    endpoint: str = "",
    work_id: Optional[int] = None,
) -> Any:
    prompt = PROMPTS.get(prompt_name)
    if prompt is None:
        raise HTTPException(status_code=400, detail=f"Unknown prompt: {prompt_name}")
    try:
        resolved = resolve_prompt(db, prompt_name, variables)
    except AssemblyRenderError as e:
        raise HTTPException(
            status_code=422, detail={"code": e.code, "message": e.message}
        ) from e
    system, user = resolved.system, resolved.user
    cfg = ai_client.resolve_config(db, prompt_name=prompt_name)
    started = time.monotonic()
    try:
        text = ai_client.chat(
            db,
            system=system,
            user=user,
            json_mode=json_mode and prompt.json_mode,
            prompt_name=prompt_name,
            cfg=cfg,
        )
    except ai_client.AIServiceError as e:
        duration_ms = int((time.monotonic() - started) * 1000)
        status = "not_configured" if e.code == "not_configured" else "error"
        llm_log.record(
            db,
            prompt_name=prompt_name,
            endpoint=endpoint,
            system=system,
            user=user,
            status=status,
            error=str(e),
            duration_ms=duration_ms,
            work_id=work_id,
            profile_id=cfg.profile_id,
            provider=cfg.provider,
            model=cfg.model,
            prompt_assembly_id=resolved.assembly_id,
        )
        code = 503 if e.code == "not_configured" else 502
        raise HTTPException(status_code=code, detail=str(e)) from e
    duration_ms = int((time.monotonic() - started) * 1000)
    llm_log.record(
        db,
        prompt_name=prompt_name,
        endpoint=endpoint,
        system=system,
        user=user,
        status="ok",
        response=text,
        duration_ms=duration_ms,
        work_id=work_id,
        profile_id=cfg.profile_id,
        provider=cfg.provider,
        model=cfg.model,
        prompt_assembly_id=resolved.assembly_id,
    )
    if json_mode:
        return _parse_json(text)
    return text


def _require_work(db: Session, work_id: int):
    from app.models.work import Work

    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


# =============================================================================
# Endpoints
# =============================================================================

@router.post("/suggest/outline")
def suggest_outline(payload: OutlineRequest, db: Session = Depends(get_db)):
    work = _require_work(db, payload.work_id)
    target = payload.target_words or work.target_words or 1_000_000
    data = _call(
        db,
        "outline",
        {
            "title": work.title,
            "genre": work.genre or "通用",
            "style": work.style or "通用",
            "pov": work.pov or "第三人称",
            "description": work.description or "(无简介)",
            "target_words": target,
            "volume_count": payload.volume_count,
        },
        endpoint="/ai/suggest/outline",
        work_id=work.id,
    )
    return {"work_id": work.id, "volumes": data.get("volumes", []), "raw": data}


@router.post("/suggest/chapters")
def suggest_chapters(payload: ChaptersRequest, db: Session = Depends(get_db)):
    from app.models.volume import Volume

    work = _require_work(db, payload.work_id)
    vol = db.get(Volume, payload.volume_id)
    if not vol or vol.work_id != work.id:
        raise HTTPException(status_code=400, detail="volume_id does not belong to work")
    data = _call(
        db,
        "chapters",
        {
            "work_title": work.title,
            "volume_title": vol.title,
            "volume_summary": vol.summary or "(无)",
            "target_chapter_count": payload.target_chapter_count,
        },
        endpoint="/ai/suggest/chapters",
        work_id=work.id,
    )
    return {"work_id": work.id, "volume_id": vol.id, "chapters": data.get("chapters", []), "raw": data}


@router.post("/suggest/character")
def suggest_character(payload: CharacterRequest, db: Session = Depends(get_db)):
    work = _require_work(db, payload.work_id)
    data = _call(
        db,
        "character",
        {
            "work_title": work.title,
            "genre": work.genre or "通用",
            "role": payload.role,
            "existing_chars": ctx.characters_summary(db, work.id),
        },
        endpoint="/ai/suggest/character",
        work_id=work.id,
    )
    return {"work_id": work.id, "character": data.get("character", data), "raw": data}


@router.post("/suggest/event")
def suggest_event(payload: EventRequest, db: Session = Depends(get_db)):
    work = _require_work(db, payload.work_id)
    data = _call(
        db,
        "event",
        {
            "work_title": work.title,
            "genre": work.genre or "通用",
            "current_summary": payload.current_summary or ctx.chapters_summary(db, work.id),
            "existing_events": ctx.events_summary(db, work.id),
            "count": payload.count,
        },
        endpoint="/ai/suggest/event",
        work_id=work.id,
    )
    return {"work_id": work.id, "events": data.get("events", []), "raw": data}


@router.post("/check/consistency")
def check_consistency(payload: ConsistencyRequest, db: Session = Depends(get_db)):
    work = _require_work(db, payload.work_id)
    settings_summary = ctx.full_context(db, work.id)
    data = _call(
        db,
        "consistency",
        {
            "settings_summary": settings_summary,
            "new_content": payload.new_content,
        },
        endpoint="/ai/check/consistency",
        work_id=work.id,
    )
    return {"work_id": work.id, "issues": data.get("issues", []), "summary": data.get("summary", ""), "raw": data}


@router.post("/chat")
def free_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    if payload.work_id is not None:
        _require_work(db, payload.work_id)
        context_text = ctx.full_context(db, payload.work_id)
    else:
        context_text = "(未载入作品上下文)"
    try:
        resolved = resolve_prompt(
            db,
            "chat",
            {"context": context_text, "question": payload.question},
        )
    except AssemblyRenderError as e:
        raise HTTPException(
            status_code=422, detail={"code": e.code, "message": e.message}
        ) from e
    system, user = resolved.system, resolved.user
    cfg = ai_client.resolve_config(db, prompt_name="chat")
    started = time.monotonic()
    try:
        text = ai_client.chat(
            db,
            system=system,
            user=user,
            json_mode=False,
            prompt_name="chat",
            cfg=cfg,
        )
    except ai_client.AIServiceError as e:
        duration_ms = int((time.monotonic() - started) * 1000)
        status = "not_configured" if e.code == "not_configured" else "error"
        llm_log.record(
            db,
            prompt_name="chat",
            endpoint="/ai/chat",
            system=system,
            user=user,
            status=status,
            error=str(e),
            duration_ms=duration_ms,
            work_id=payload.work_id,
            profile_id=cfg.profile_id,
            provider=cfg.provider,
            model=cfg.model,
            prompt_assembly_id=resolved.assembly_id,
        )
        code = 503 if e.code == "not_configured" else 502
        raise HTTPException(status_code=code, detail=str(e)) from e
    duration_ms = int((time.monotonic() - started) * 1000)
    llm_log.record(
        db,
        prompt_name="chat",
        endpoint="/ai/chat",
        system=system,
        user=user,
        status="ok",
        response=text,
        duration_ms=duration_ms,
        work_id=payload.work_id,
        profile_id=cfg.profile_id,
        provider=cfg.provider,
        model=cfg.model,
        prompt_assembly_id=resolved.assembly_id,
    )
    return {"answer": text}


@router.get("/status")
def ai_status(db: Session = Depends(get_db)):
    """Return the default profile's effective config + saved profiles +
    per-prompt assignments. The legacy single ``app_settings`` ai.* keys
    are migrated into a default profile on first access; from then on the
    legacy rows are removed and no longer appear here."""
    cfg = ai_client.resolve_config(db)  # may run legacy migration
    default = get_default_profile(db)
    return {
        "configured": cfg.is_configured,
        "base_url": cfg.base_url,
        "model": cfg.model,
        "temperature": cfg.temperature,
        "provider": cfg.provider,
        "default_profile_id": default.id if default else None,
        "default_profile_name": default.name if default else None,
        "profiles": [profile_to_summary(p) for p in list_profiles(db)],
        "assignments": list_assignments(db),
    }


# -----------------------------------------------------------------------------
# Prompt catalog (read-only, no LLM call)
# -----------------------------------------------------------------------------

@router.get("/prompts", response_model=list[PromptSummary])
def list_prompt_templates():
    return [
        PromptSummary(name=p.name, json_mode=p.json_mode, temperature=p.temperature)
        for p in ai_prompts.list_prompts()
    ]


@router.get("/prompts/{name}", response_model=PromptDetail)
def get_prompt_template(name: str):
    p = ai_prompts.get_prompt(name)
    if p is None:
        raise HTTPException(status_code=404, detail=f"Unknown prompt: {name}")
    return PromptDetail(
        name=p.name,
        system=p.system,
        user_template=p.user_template,
        json_mode=p.json_mode,
        temperature=p.temperature,
    )


@router.post("/suggest/continue")
def suggest_continue(payload: ContinueRequest, db: Session = Depends(get_db)):
    from app.models.chapter import Chapter

    work = _require_work(db, payload.work_id)
    ch = db.get(Chapter, payload.chapter_id)
    if not ch or ch.work_id != work.id:
        raise HTTPException(status_code=400, detail="chapter_id does not belong to work")

    # take last N chars of the chapter content as context
    text = ch.content or ""
    tail = text[-payload.tail_chars:] if text else "(本章尚无正文)"

    chapter_meta_parts = [
        f"标题: {ch.title}",
        f"概要: {ch.summary or '(无)'}",
        f"大纲: {ch.outline or '(无)'}",
        f"类型: {ch.chapter_type}",
    ]
    chapter_meta = "\n".join(chapter_meta_parts)

    data = _call(
        db,
        "continue",
        {
            "work_title": work.title,
            "genre": work.genre or "通用",
            "style": work.style or "通用",
            "pov": work.pov or "第三人称",
            "chapter_meta": chapter_meta,
            "characters_summary": ctx.characters_summary(db, work.id),
            "tail": tail,
            "tail_chars": payload.tail_chars,
            "target_chars": payload.target_chars,
        },
        json_mode=False,
        endpoint="/ai/suggest/continue",
        work_id=work.id,
    )
    # plain text response — extract from prompt return
    return {"work_id": work.id, "chapter_id": ch.id, "text": data}


@router.post("/suggest/expand")
def suggest_expand(payload: ExpandRequest, db: Session = Depends(get_db)):
    work = _require_work(db, payload.work_id)
    data = _call(
        db,
        "expand",
        {
            "work_title": work.title,
            "genre": work.genre or "通用",
            "style": work.style or "通用",
            "selection": payload.selection,
            "target_chars": payload.target_chars,
        },
        json_mode=False,
        endpoint="/ai/suggest/expand",
        work_id=work.id,
    )
    return {"work_id": work.id, "text": data}