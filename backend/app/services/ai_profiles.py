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

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.prompts import PROMPTS
from app.models.ai_prompt_assignment import AIPromptAssignment
from app.models.ai_service_profile import AIServiceProfile
from app.schemas.ai_profile import AIProfileOut, AIProfileSummary
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


def get_profile(db: Session, profile_id: int) -> AIServiceProfile | None:
    return db.get(AIServiceProfile, profile_id)


def get_profile_by_name(db: Session, name: str) -> AIServiceProfile | None:
    return db.scalars(
        select(AIServiceProfile).where(AIServiceProfile.name == name).limit(1)
    ).first()


def _ensure_single_default(
    db: Session,
    *,
    new_default_id: int | None,
) -> None:
    """Set exactly one profile to ``True``. ``None`` clears all.

    Uses two bulk ``UPDATE`` statements instead of loading every row into
    Python; for large profile tables this avoids an O(N) round-trip per
    write.
    """
    from sqlalchemy import update

    # Clear every is_default flag, then set the new one (if any). Order
    # matters: we don't want a transient moment where two rows claim
    # ``is_default=True``.
    db.execute(update(AIServiceProfile).values(is_default=False))
    if new_default_id is not None:
        db.execute(
            update(AIServiceProfile)
            .where(AIServiceProfile.id == new_default_id)
            .values(is_default=True)
        )


def create_profile(
    db: Session,
    *,
    name: str,
    provider: str,
    base_url: str,
    model: str,
    temperature: float,
    api_key: str | None = None,
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
    name: str | None = None,
    provider: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
    temperature: float | None = None,
    api_key: str | None = None,
    is_default: bool | None = None,
) -> AIServiceProfile | None:
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
    elif is_default is False and profile.is_default:
        # explicitly demoting the current default — must promote another profile,
        # otherwise the invariant "exactly one default" would be violated.
        total = db.scalar(select(func.count(AIServiceProfile.id))) or 0
        if total <= 1:
            raise ValueError("必须保留一个默认 profile；请先新建另一个 profile")
        successor = db.scalars(
            select(AIServiceProfile)
            .where(AIServiceProfile.id != profile.id)
            .order_by(AIServiceProfile.id.asc())
            .limit(1)
        ).first()
        _ensure_single_default(db, new_default_id=successor.id if successor else None)
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


def set_default(db: Session, profile_id: int) -> AIServiceProfile | None:
    profile = db.get(AIServiceProfile, profile_id)
    if profile is None:
        return None
    _ensure_single_default(db, new_default_id=profile_id)
    db.commit()
    db.refresh(profile)
    return profile


def get_default_profile(db: Session) -> AIServiceProfile | None:
    return db.scalars(
        select(AIServiceProfile)
        .where(AIServiceProfile.is_default.is_(True))
        .limit(1)
    ).first()


# --------------------------------------------------------------------------
# Assignments
# --------------------------------------------------------------------------

def list_assignments(db: Session) -> dict[str, int | None]:
    rows = db.scalars(select(AIPromptAssignment)).all()
    return {row.prompt_name: row.profile_id for row in rows}


def set_assignment(
    db: Session,
    prompt_name: str,
    profile_id: int | None,
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
    prompt_name: str | None = None,
) -> AIServiceProfile | None:
    """Pick the profile that should serve ``prompt_name``.

    Resolution order:

    1. explicit ``ai_prompt_assignments[prompt_name]``
    2. the ``is_default=True`` profile
    3. (fallback) run the one-shot legacy ``app_settings`` migration if no
       profiles exist yet. This is idempotent and normally already
       handled by the startup hook in :mod:`app.main`; kept here so
       tests that bypass startup still get the right answer.
    """
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


def _maybe_migrate_legacy(db: Session) -> AIServiceProfile | None:
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


def ensure_legacy_migrated(db: Session) -> AIServiceProfile | None:
    """Run the one-shot legacy migration eagerly.

    Intended to be called once at app startup (see :mod:`app.main`) so
    that ``resolve_profile`` / ``resolve_config`` can stay read-only on
    the hot path. Idempotent: returns ``None`` when there is nothing to
    migrate.
    """
    if db.scalar(select(func.count(AIServiceProfile.id))) > 0:
        return None
    return _maybe_migrate_legacy(db)


# --------------------------------------------------------------------------
# Output shaping
# --------------------------------------------------------------------------

def profile_to_summary(profile: AIServiceProfile) -> AIProfileSummary:
    return AIProfileSummary.model_validate(
        {
            "id": profile.id,
            "name": profile.name,
            "provider": profile.provider,
            "model": profile.model,
            "is_default": profile.is_default,
            "has_api_key": bool(profile.api_key),
        }
    )


def profile_to_out(profile: AIServiceProfile) -> AIProfileOut:
    # has_api_key is a derived field on the ORM, so build the dict explicitly.
    return AIProfileOut.model_validate(
        {
            "id": profile.id,
            "name": profile.name,
            "provider": profile.provider,
            "base_url": profile.base_url,
            "model": profile.model,
            "temperature": profile.temperature,
            "is_default": profile.is_default,
            "has_api_key": bool(profile.api_key),
            "created_at": profile.created_at,
            "updated_at": profile.updated_at,
        }
    )