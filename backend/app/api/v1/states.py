
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.deps import (
    get_scoped_or_404,
    get_work_or_404,
    validate_child_belongs_to_work,
)
from app.database import get_db
from app.models.chapter import Chapter
from app.models.character import Character
from app.models.state import CharacterState
from app.schemas.state import StateCreate, StateOut, StateUpdate

router = APIRouter(prefix="/works/{work_id}/states", tags=["states"])


@router.get("", response_model=list[StateOut])
def list_states(
    work_id: int,
    character_id: int | None = Query(None),
    chapter_id: int | None = Query(None),
    state_type: str | None = Query(None),
    state_key: str | None = Query(None),
    db: Session = Depends(get_db),
):
    get_work_or_404(db, work_id)
    stmt = select(CharacterState).where(CharacterState.work_id == work_id)
    if character_id is not None:
        stmt = stmt.where(CharacterState.character_id == character_id)
    if chapter_id is not None:
        stmt = stmt.where(CharacterState.chapter_id == chapter_id)
    if state_type:
        stmt = stmt.where(CharacterState.state_type == state_type)
    if state_key:
        stmt = stmt.where(CharacterState.state_key == state_key)
    stmt = stmt.order_by(
        CharacterState.captured_at.is_(None),
        CharacterState.captured_at,
        CharacterState.id,
    )
    return list(db.scalars(stmt).all())


@router.post("", response_model=StateOut, status_code=status.HTTP_201_CREATED)
def create_state(
    work_id: int,
    payload: StateCreate,
    db: Session = Depends(get_db),
):
    get_work_or_404(db, work_id)
    validate_child_belongs_to_work(
        db,
        model=Character,
        work_id=work_id,
        child_id=payload.character_id,
        label="character_id",
    )
    validate_child_belongs_to_work(
        db,
        model=Chapter,
        work_id=work_id,
        child_id=payload.chapter_id,
        label="chapter_id",
    )
    s = CharacterState(work_id=work_id, **payload.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("/{state_id}", response_model=StateOut)
def get_state(work_id: int, state_id: int, db: Session = Depends(get_db)):
    return get_scoped_or_404(
        db,
        model=CharacterState,
        work_id=work_id,
        child_id=state_id,
        label="State",
    )


@router.put("/{state_id}", response_model=StateOut)
def update_state(
    work_id: int,
    state_id: int,
    payload: StateUpdate,
    db: Session = Depends(get_db),
):
    s = get_scoped_or_404(
        db,
        model=CharacterState,
        work_id=work_id,
        child_id=state_id,
        label="State",
    )
    data = payload.model_dump(exclude_unset=True)
    if "chapter_id" in data:
        validate_child_belongs_to_work(
            db,
            model=Chapter,
            work_id=work_id,
            child_id=data["chapter_id"],
            label="chapter_id",
        )
    for k, v in data.items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{state_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_state(work_id: int, state_id: int, db: Session = Depends(get_db)):
    s = get_scoped_or_404(
        db,
        model=CharacterState,
        work_id=work_id,
        child_id=state_id,
        label="State",
    )
    db.delete(s)
    db.commit()
    return None