from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.character import Character
from app.models.protagonist import ProtagonistProfile
from app.models.work import Work
from app.schemas.protagonist import ProtagonistCreate, ProtagonistOut, ProtagonistUpdate

router = APIRouter(prefix="/works/{work_id}/protagonists", tags=["protagonists"])


def _get_work_or_404(work_id: int, db: Session) -> Work:
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


def _get_protagonist_or_404(profile_id: int, work_id: int, db: Session) -> ProtagonistProfile:
    p = db.get(ProtagonistProfile, profile_id)
    if not p or p.work_id != work_id:
        raise HTTPException(status_code=404, detail="Protagonist profile not found")
    return p


@router.get("", response_model=List[ProtagonistOut])
def list_protagonists(work_id: int, db: Session = Depends(get_db)):
    _get_work_or_404(work_id, db)
    stmt = select(ProtagonistProfile).where(ProtagonistProfile.work_id == work_id)
    return list(db.scalars(stmt).all())


@router.post("", response_model=ProtagonistOut, status_code=status.HTTP_201_CREATED)
def create_protagonist(
    work_id: int,
    payload: ProtagonistCreate,
    db: Session = Depends(get_db),
):
    _get_work_or_404(work_id, db)
    ch = db.get(Character, payload.character_id)
    if not ch or ch.work_id != work_id:
        raise HTTPException(status_code=400, detail="character_id does not belong to work")

    profile = ProtagonistProfile(
        work_id=work_id,
        character_id=payload.character_id,
        **{k: v for k, v in payload.model_dump().items() if k != "character_id"},
    )
    db.add(profile)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Character already has a protagonist profile")
    db.refresh(profile)
    return profile


@router.get("/{profile_id}", response_model=ProtagonistOut)
def get_protagonist(work_id: int, profile_id: int, db: Session = Depends(get_db)):
    return _get_protagonist_or_404(profile_id, work_id, db)


@router.put("/{profile_id}", response_model=ProtagonistOut)
def update_protagonist(
    work_id: int,
    profile_id: int,
    payload: ProtagonistUpdate,
    db: Session = Depends(get_db),
):
    p = _get_protagonist_or_404(profile_id, work_id, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_protagonist(work_id: int, profile_id: int, db: Session = Depends(get_db)):
    p = _get_protagonist_or_404(profile_id, work_id, db)
    db.delete(p)
    db.commit()
    return None