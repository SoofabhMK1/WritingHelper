"""AI routes: outline / chapters / character / event / chat / consistency.

These endpoints hit the configured LLM and return structured JSON. The
underlying provider is configured via /api/v1/settings (api_key/base_url/model).
"""
from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai import client as ai_client
from app.ai import context as ctx
from app.ai import prompts as ai_prompts
from app.ai.prompts import (
    PROMPTS,
    render,
)
from app.database import get_db

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


def _call(db: Session, prompt_name: str, variables: dict[str, Any], json_mode: bool = True) -> Any:
    prompt = PROMPTS.get(prompt_name)
    if prompt is None:
        raise HTTPException(status_code=400, detail=f"Unknown prompt: {prompt_name}")
    system, user = render(prompt, variables)
    try:
        text = ai_client.chat(
            db,
            system=system,
            user=user,
            json_mode=json_mode and prompt.json_mode,
        )
    except ai_client.AIServiceError as e:
        code = 503 if e.code == "not_configured" else 502
        raise HTTPException(status_code=code, detail=str(e)) from e
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
    )
    return {"work_id": work.id, "issues": data.get("issues", []), "summary": data.get("summary", ""), "raw": data}


@router.post("/chat")
def free_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    if payload.work_id is not None:
        _require_work(db, payload.work_id)
        context_text = ctx.full_context(db, payload.work_id)
    else:
        context_text = "(未载入作品上下文)"
    system, user = render(
        PROMPTS["chat"],
        {"context": context_text, "question": payload.question},
    )
    try:
        text = ai_client.chat(db, system=system, user=user, json_mode=False)
    except ai_client.AIServiceError as e:
        code = 503 if e.code == "not_configured" else 502
        raise HTTPException(status_code=code, detail=str(e)) from e
    return {"answer": text}


@router.get("/status")
def ai_status(db: Session = Depends(get_db)):
    cfg = ai_client.resolve_config(db)
    return {
        "configured": cfg.is_configured,
        "base_url": cfg.base_url,
        "model": cfg.model,
        "temperature": cfg.temperature,
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
    )
    return {"work_id": work.id, "text": data}