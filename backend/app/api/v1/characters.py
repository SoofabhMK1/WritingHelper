
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.deps import get_scoped_or_404, get_work_or_404
from app.database import get_db
from app.models.character import Character
from app.schemas.character import CharacterCreate, CharacterOut, CharacterUpdate

router = APIRouter(prefix="/works/{work_id}/characters", tags=["characters"])


@router.get("", response_model=list[CharacterOut])
def list_characters(
    work_id: int,
    role: str | None = Query(None),
    q: str | None = Query(None),
    db: Session = Depends(get_db),
):
    get_work_or_404(db, work_id)
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
    get_work_or_404(db, work_id)
    ch = Character(work_id=work_id, **payload.model_dump())
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return ch


@router.get("/{character_id}", response_model=CharacterOut)
def get_character(work_id: int, character_id: int, db: Session = Depends(get_db)):
    return get_scoped_or_404(
        db, model=Character, work_id=work_id, child_id=character_id, label="Character"
    )


@router.put("/{character_id}", response_model=CharacterOut)
def update_character(
    work_id: int,
    character_id: int,
    payload: CharacterUpdate,
    db: Session = Depends(get_db),
):
    ch = get_scoped_or_404(
        db, model=Character, work_id=work_id, child_id=character_id, label="Character"
    )
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(ch, key, value)
    db.commit()
    db.refresh(ch)
    return ch


@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_character(work_id: int, character_id: int, db: Session = Depends(get_db)):
    ch = get_scoped_or_404(
        db, model=Character, work_id=work_id, child_id=character_id, label="Character"
    )
    db.delete(ch)
    db.commit()
    return None