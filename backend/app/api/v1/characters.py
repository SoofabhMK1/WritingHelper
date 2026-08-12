from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.character import Character
from app.models.work import Work
from app.schemas.character import CharacterCreate, CharacterOut, CharacterUpdate

router = APIRouter(prefix="/works/{work_id}/characters", tags=["characters"])


def _get_work_or_404(work_id: int, db: Session) -> Work:
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


def _get_character_or_404(character_id: int, work_id: int, db: Session) -> Character:
    ch = db.get(Character, character_id)
    if not ch or ch.work_id != work_id:
        raise HTTPException(status_code=404, detail="Character not found")
    return ch


@router.get("", response_model=List[CharacterOut])
def list_characters(
    work_id: int,
    role: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    _get_work_or_404(work_id, db)
    stmt = select(Character).where(Character.work_id == work_id)
    if role:
        stmt = stmt.where(Character.role == role)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Character.name.ilike(like))
    stmt = stmt.order_by(Character.id)
    return list(db.scalars(stmt).all())


@router.post("", response_model=CharacterOut, status_code=status.HTTP_201_CREATED)
def create_character(
    work_id: int,
    payload: CharacterCreate,
    db: Session = Depends(get_db),
):
    _get_work_or_404(work_id, db)
    ch = Character(work_id=work_id, **payload.model_dump())
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return ch


@router.get("/{character_id}", response_model=CharacterOut)
def get_character(work_id: int, character_id: int, db: Session = Depends(get_db)):
    return _get_character_or_404(character_id, work_id, db)


@router.put("/{character_id}", response_model=CharacterOut)
def update_character(
    work_id: int,
    character_id: int,
    payload: CharacterUpdate,
    db: Session = Depends(get_db),
):
    ch = _get_character_or_404(character_id, work_id, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(ch, key, value)
    db.commit()
    db.refresh(ch)
    return ch


@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_character(work_id: int, character_id: int, db: Session = Depends(get_db)):
    ch = _get_character_or_404(character_id, work_id, db)
    db.delete(ch)
    db.commit()
    return None