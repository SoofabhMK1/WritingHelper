"""Shared FastAPI dependencies used by all `/works/{work_id}/...` routers.

Two helpers live here:

- :func:`get_work_or_404` — fetch a :class:`Work` by id or 404.
- :func:`get_scoped_or_404` — fetch a child row by id, asserting it belongs to
  the work. Used by every per-resource router.
- :func:`validate_child_belongs_to_work` — for ``Optional[int]`` FK fields,
  validates the FK row exists and belongs to the work. Raises 400.

Keeping these in one place prevents the seven near-identical private helpers
that used to live in ``volumes.py`` / ``chapters.py`` / ``characters.py`` /
``protagonists.py`` / ``events.py`` / ``states.py`` / ``foreshadowing.py``
from drifting apart.
"""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.work import Work


def get_work_or_404(db: Session, work_id: int) -> Work:
    work = db.get(Work, work_id)
    if work is None:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


def get_scoped_or_404(
    db: Session,
    *,
    model: type[Any],
    work_id: int,
    child_id: int,
    label: str,
) -> Any:
    """Fetch ``model[child_id]`` and assert ``obj.work_id == work_id``."""
    obj = db.get(model, child_id)
    if obj is None or obj.work_id != work_id:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return obj


def validate_child_belongs_to_work(
    db: Session,
    *,
    model: type[Any],
    work_id: int,
    child_id: int | None,
    label: str,
) -> None:
    """For Optional FK fields: pass when None; raise 400 when invalid.

    Used by routes that accept a ``chapter_id`` / ``volume_id`` /
    ``character_id`` in a payload and want to enforce it belongs to the
    work.
    """
    if child_id is None:
        return
    obj = db.get(model, child_id)
    if obj is None or obj.work_id != work_id:
        raise HTTPException(
            status_code=400, detail=f"{label} does not belong to work"
        )