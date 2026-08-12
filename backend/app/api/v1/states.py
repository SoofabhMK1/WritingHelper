from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.character import Character
from app.models.chapter import Chapter
from app.models.state import CharacterState
from app.models.work import Work
from app.schemas.state import StateCreate, StateOut, StateUpdate

router = APIRouter(prefix="/works/{work_id}/states", tags=["states"])


def _get_work_or_404(work_id: int, db: Session) -> Work:
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


def _get_state_or_404(state_id: int, work_id: int, db: Session) -> CharacterState:
    s = db.get(CharacterState, state_id)
    if not s or s.work_id != work_id:
        raise HTTPException(status_code=404, detail="State not found")
    return s


def _validate_character(character_id: int, work_id: int, db: Session) -> Character:
    ch = db.get(Character, character_id)
    if not ch or ch.work_id != work_id:
        raise HTTPException(status_code=400, detail="character_id does not belong to work")
    return ch


def _validate_chapter(chapter_id: Optional[int], work_id: int, db: Session) -> None:
    if chapter_id is None:
        return
    ch = db.get(Chapter, chapter_id)
    if not ch or ch.work_id != work_id:
        raise HTTPException(status_code=400, detail="chapter_id does not belong to work")


@router.get("", response_model=List[StateOut])
def list_states(
    work_id: int,
    character_id: Optional[int] = Query(None),
    chapter_id: Optional[int] = Query(None),
    state_type: Optional[str] = Query(None),
    state_key: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    _get_work_or_404(work_id, db)
    stmt = select(CharacterState).where(CharacterState.work_id == work_id)
    if character_id is not None:
        stmt = stmt.where(CharacterState.character_id == character_id)
    if chapter_id is not None:
        stmt = stmt.where(CharacterState.chapter_id == chapter_id)
    if state_type:
        stmt = stmt.where(CharacterState.state_type == state_type)
    if state_key:
        stmt = stmt.where(CharacterState.state_key == state_key)
    # 按 captured_at 升序(空置末),再按 id
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
    _get_work_or_404(work_id, db)
    _validate_character(payload.character_id, work_id, db)
    _validate_chapter(payload.chapter_id, work_id, db)
    s = CharacterState(work_id=work_id, **payload.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("/{state_id}", response_model=StateOut)
def get_state(work_id: int, state_id: int, db: Session = Depends(get_db)):
    return _get_state_or_404(state_id, work_id, db)


@router.put("/{state_id}", response_model=StateOut)
def update_state(
    work_id: int,
    state_id: int,
    payload: StateUpdate,
    db: Session = Depends(get_db),
):
    s = _get_state_or_404(state_id, work_id, db)
    data = payload.model_dump(exclude_unset=True)
    if "chapter_id" in data:
        _validate_chapter(data["chapter_id"], work_id, db)
    for k, v in data.items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{state_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_state(work_id: int, state_id: int, db: Session = Depends(get_db)):
    s = _get_state_or_404(state_id, work_id, db)
    db.delete(s)
    db.commit()
    return None