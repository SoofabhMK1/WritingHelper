"""CRUD operations for PromptFragment."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.prompt_fragment import PromptFragment
from app.schemas.prompt_fragment import PromptFragmentCreate, PromptFragmentUpdate


def list_fragments(
    db: Session,
    q: Optional[str] = None,
) -> list[PromptFragment]:
    stmt = select(PromptFragment)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(PromptFragment.name.ilike(like))
    stmt = stmt.order_by(PromptFragment.id)
    return list(db.scalars(stmt).all())


def get_fragment(db: Session, fragment_id: int) -> Optional[PromptFragment]:
    return db.get(PromptFragment, fragment_id)


def create_fragment(
    db: Session, payload: PromptFragmentCreate
) -> PromptFragment:
    row = PromptFragment(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_fragment(
    db: Session, fragment_id: int, payload: PromptFragmentUpdate
) -> Optional[PromptFragment]:
    row = db.get(PromptFragment, fragment_id)
    if row is None:
        return None
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


def delete_fragment(db: Session, fragment_id: int) -> bool:
    row = db.get(PromptFragment, fragment_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def get_fragments_by_ids(
    db: Session, ids: list[int]
) -> dict[int, PromptFragment]:
    """Bulk lookup by ids. Missing ids are simply absent from the result."""
    if not ids:
        return {}
    rows = db.scalars(
        select(PromptFragment).where(PromptFragment.id.in_(ids))
    ).all()
    return {r.id: r for r in rows}