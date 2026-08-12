"""Routes for saved AI service profiles and per-prompt assignments.

These are *configuration* endpoints — they don't trigger any LLM call.
They live under the existing ``/api/v1/ai`` prefix to keep all AI-related
routes in one namespace.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai.prompts import list_prompts
from app.database import get_db
from app.schemas.ai_profile import (
    AIProfileCreate,
    AIProfileOut,
    AIProfileUpdate,
    AssignmentMap,
    AssignmentUpdate,
)
from app.services.ai_profiles import (
    create_profile,
    delete_assignment,
    delete_profile,
    get_profile,
    get_profile_by_name,
    list_assignments,
    list_profiles,
    profile_to_out,
    set_assignment,
    set_default,
    update_profile,
)


router = APIRouter(prefix="/ai", tags=["ai"])


# -----------------------------------------------------------------------------
# Profiles
# -----------------------------------------------------------------------------


@router.get("/profiles", response_model=list[AIProfileOut])
def list_ai_profiles(db: Session = Depends(get_db)):
    return [profile_to_out(p) for p in list_profiles(db)]


@router.post(
    "/profiles",
    response_model=AIProfileOut,
    status_code=status.HTTP_201_CREATED,
)
def create_ai_profile(payload: AIProfileCreate, db: Session = Depends(get_db)):
    if get_profile_by_name(db, payload.name) is not None:
        raise HTTPException(status_code=400, detail=f"配置名称已存在: {payload.name}")
    profile = create_profile(
        db,
        name=payload.name,
        provider=payload.provider,
        base_url=payload.base_url,
        model=payload.model,
        temperature=payload.temperature,
        api_key=payload.api_key,
        is_default=payload.is_default,
    )
    return profile_to_out(profile)


@router.get("/profiles/{profile_id}", response_model=AIProfileOut)
def get_ai_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = get_profile(db, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile_to_out(profile)


@router.put("/profiles/{profile_id}", response_model=AIProfileOut)
def update_ai_profile(
    profile_id: int,
    payload: AIProfileUpdate,
    db: Session = Depends(get_db),
):
    profile = get_profile(db, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    if payload.name and payload.name != profile.name:
        if get_profile_by_name(db, payload.name) is not None:
            raise HTTPException(status_code=400, detail=f"配置名称已存在: {payload.name}")
    updated = update_profile(
        db,
        profile_id,
        name=payload.name,
        provider=payload.provider,
        base_url=payload.base_url,
        model=payload.model,
        temperature=payload.temperature,
        api_key=payload.api_key,
        is_default=payload.is_default,
    )
    return profile_to_out(updated)


@router.delete("/profiles/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ai_profile(profile_id: int, db: Session = Depends(get_db)):
    if not delete_profile(db, profile_id):
        raise HTTPException(status_code=404, detail="Profile not found")
    return None


@router.put("/profiles/{profile_id}/default", response_model=AIProfileOut)
def set_default_ai_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = set_default(db, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile_to_out(profile)


# -----------------------------------------------------------------------------
# Prompt assignments
# -----------------------------------------------------------------------------


@router.get("/prompt-assignments", response_model=AssignmentMap)
def list_prompt_assignments(db: Session = Depends(get_db)):
    return AssignmentMap(assignments=list_assignments(db))


@router.put("/prompt-assignments/{prompt_name}", response_model=AssignmentMap)
def set_prompt_assignment(
    prompt_name: str,
    payload: AssignmentUpdate,
    db: Session = Depends(get_db),
):
    known = {p.name for p in list_prompts()}
    if prompt_name not in known:
        raise HTTPException(status_code=404, detail=f"Unknown prompt: {prompt_name}")
    try:
        set_assignment(db, prompt_name, payload.profile_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return AssignmentMap(assignments=list_assignments(db))


@router.delete(
    "/prompt-assignments/{prompt_name}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def clear_prompt_assignment(prompt_name: str, db: Session = Depends(get_db)):
    known = {p.name for p in list_prompts()}
    if prompt_name not in known:
        raise HTTPException(status_code=404, detail=f"Unknown prompt: {prompt_name}")
    delete_assignment(db, prompt_name)
    return None