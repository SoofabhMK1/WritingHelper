"""Saved AI service profiles + per-prompt assignments.

Persistence is split across two tables:

- ``ai_service_profiles``: a saved OpenAI-compatible configuration
  (base_url / api_key / model / temperature). Exactly one row has
  ``is_default=True`` at a time; uniqueness is enforced by the service
  layer inside a single transaction.
- ``ai_prompt_assignments``: maps a registered prompt (see
  ``app.ai.prompts.PROMPTS``) to a profile id. NULL means "use the
  default profile".

Lookup order at request time (see :func:`resolve_profile`):

  1. explicit ``ai_prompt_assignments[p]``
  2. ``is_default=True`` profile
  3. legacy single ``app_settings`` ai.* keys (one-shot migration; the
     legacy rows are then deleted so the UI doesn't show duplicates)
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.prompts import PROMPTS
from app.models.ai_prompt_assignment import AIPromptAssignment
from app.models.ai_service_profile import AIServiceProfile
from app.services.settings import (
    KEY_API_KEY,
    KEY_BASE_URL,
    KEY_MODEL,
    KEY_TEMPERATURE,
    delete_setting,
    get_setting,
)


LEGACY_DEFAULT_NAME = "迁移自旧配置"


# --------------------------------------------------------------------------
# Profile CRUD
# --------------------------------------------------------------------------

def list_profiles(db: Session) -> list[AIServiceProfile]:
    return list(
        db.scalars(
            select(AIServiceProfile).order_by(
                AIServiceProfile.is_default.desc(),
                AIServiceProfile.id.asc(),
            )
        ).all()
    )


def get_profile(db: Session, profile_id: int) -> Optional[AIServiceProfile]:
    return db.get(AIServiceProfile, profile_id)


def get_profile_by_name(db: Session, name: str) -> Optional[AIServiceProfile]:
    return db.scalars(
        select(AIServiceProfile).where(AIServiceProfile.name == name).limit(1)
    ).first()


def _ensure_single_default(
    db: Session,
    *,
    new_default_id: Optional[int],
) -> None:
    """Set exactly one profile to ``True``. ``None`` clears all."""
    rows = db.scalars(select(AIServiceProfile)).all()
    for row in rows:
        row.is_default = row.id == new_default_id


def create_profile(
    db: Session,
    *,
    name: str,
    provider: str,
    base_url: str,
    model: str,
    temperature: float,
    api_key: Optional[str] = None,
    is_default: bool = False,
) -> AIServiceProfile:
    profile = AIServiceProfile(
        name=name,
        provider=provider,
        base_url=base_url,
        model=model,
        temperature=temperature,
        api_key=api_key or "",
        is_default=is_default,
    )
    db.add(profile)
    db.flush()  # assign id
    if is_default:
        _ensure_single_default(db, new_default_id=profile.id)
        db.flush()
    db.commit()
    db.refresh(profile)
    return profile


def update_profile(
    db: Session,
    profile_id: int,
    *,
    name: Optional[str] = None,
    provider: Optional[str] = None,
    base_url: Optional[str] = None,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    api_key: Optional[str] = None,
    is_default: Optional[bool] = None,
) -> Optional[AIServiceProfile]:
    """Partial update. ``api_key=""`` clears; ``None`` leaves alone."""
    profile = db.get(AIServiceProfile, profile_id)
    if profile is None:
        return None
    if name is not None:
        profile.name = name
    if provider is not None:
        profile.provider = provider
    if base_url is not None:
        profile.base_url = base_url
    if model is not None:
        profile.model = model
    if temperature is not None:
        profile.temperature = temperature
    if api_key is not None:
        profile.api_key = api_key
    if is_default is True:
        _ensure_single_default(db, new_default_id=profile.id)
    db.commit()
    db.refresh(profile)
    return profile


def delete_profile(db: Session, profile_id: int) -> bool:
    profile = db.get(AIServiceProfile, profile_id)
    if profile is None:
        return False
    was_default = profile.is_default
    db.delete(profile)
    db.flush()
    if was_default:
        # promote the oldest remaining profile, if any
        next_default = db.scalars(
            select(AIServiceProfile)
            .order_by(AIServiceProfile.id.asc())
            .limit(1)
        ).first()
        if next_default is not None:
            _ensure_single_default(db, new_default_id=next_default.id)
    db.commit()
    return True


def set_default(db: Session, profile_id: int) -> Optional[AIServiceProfile]:
    profile = db.get(AIServiceProfile, profile_id)
    if profile is None:
        return None
    _ensure_single_default(db, new_default_id=profile_id)
    db.commit()
    db.refresh(profile)
    return profile


def get_default_profile(db: Session) -> Optional[AIServiceProfile]:
    return db.scalars(
        select(AIServiceProfile)
        .where(AIServiceProfile.is_default.is_(True))
        .limit(1)
    ).first()


# --------------------------------------------------------------------------
# Assignments
# --------------------------------------------------------------------------

def list_assignments(db: Session) -> dict[str, Optional[int]]:
    rows = db.scalars(select(AIPromptAssignment)).all()
    return {row.prompt_name: row.profile_id for row in rows}


def set_assignment(
    db: Session,
    prompt_name: str,
    profile_id: Optional[int],
) -> AIPromptAssignment:
    if prompt_name not in PROMPTS:
        raise ValueError(f"Unknown prompt: {prompt_name}")
    if profile_id is not None and db.get(AIServiceProfile, profile_id) is None:
        raise ValueError(f"Unknown profile: {profile_id}")
    row = db.get(AIPromptAssignment, prompt_name)
    if row is None:
        row = AIPromptAssignment(prompt_name=prompt_name, profile_id=profile_id)
        db.add(row)
    else:
        row.profile_id = profile_id
    db.commit()
    db.refresh(row)
    return row


def delete_assignment(db: Session, prompt_name: str) -> bool:
    row = db.get(AIPromptAssignment, prompt_name)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


# --------------------------------------------------------------------------
# Resolution
# --------------------------------------------------------------------------

def resolve_profile(
    db: Session,
    prompt_name: Optional[str] = None,
) -> Optional[AIServiceProfile]:
    """Pick the profile that should serve ``prompt_name``."""
    if prompt_name:
        assignment = db.get(AIPromptAssignment, prompt_name)
        if assignment and assignment.profile_id is not None:
            profile = db.get(AIServiceProfile, assignment.profile_id)
            if profile is not None:
                return profile

    default = get_default_profile(db)
    if default is not None:
        return default

    if db.scalar(select(func.count(AIServiceProfile.id))) == 0:
        return _maybe_migrate_legacy(db)
    return None


def _maybe_migrate_legacy(db: Session) -> Optional[AIServiceProfile]:
    """First-run migration: lift ``app_settings`` ai.* keys into a profile.

    Runs only when the profiles table is empty AND at least one legacy
    key is present. The legacy keys are deleted afterwards so the UI
    doesn't keep showing them.
    """
    api_key = get_setting(db, KEY_API_KEY) or ""
    base_url = get_setting(db, KEY_BASE_URL)
    model = get_setting(db, KEY_MODEL)
    temperature_str = get_setting(db, KEY_TEMPERATURE)

    if not any([api_key, base_url, model, temperature_str]):
        return None

    try:
        temperature = float(temperature_str) if temperature_str else 0.7
    except ValueError:
        temperature = 0.7

    profile = create_profile(
        db,
        name=LEGACY_DEFAULT_NAME,
        provider="custom",
        base_url=base_url or "https://api.openai.com/v1",
        model=model or "gpt-4o-mini",
        temperature=temperature,
        api_key=api_key,
        is_default=True,
    )

    for key in (KEY_API_KEY, KEY_BASE_URL, KEY_MODEL, KEY_TEMPERATURE):
        delete_setting(db, key)

    return profile


# --------------------------------------------------------------------------
# Output shaping
# --------------------------------------------------------------------------

def profile_to_summary(profile: AIServiceProfile) -> dict:
    return {
        "id": profile.id,
        "name": profile.name,
        "provider": profile.provider,
        "model": profile.model,
        "is_default": profile.is_default,
        "has_api_key": bool(profile.api_key),
    }


def profile_to_out(profile: AIServiceProfile) -> dict:
    return {
        "id": profile.id,
        "name": profile.name,
        "provider": profile.provider,
        "base_url": profile.base_url,
        "model": profile.model,
        "temperature": profile.temperature,
        "is_default": profile.is_default,
        "has_api_key": bool(profile.api_key),
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }