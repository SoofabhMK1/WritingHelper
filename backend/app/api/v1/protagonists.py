
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.v1.deps import (
    get_scoped_or_404,
    get_work_or_404,
    validate_child_belongs_to_work,
)
from app.database import get_db
from app.models.character import Character
from app.models.protagonist import ProtagonistProfile
from app.schemas.protagonist import ProtagonistCreate, ProtagonistOut, ProtagonistUpdate

router = APIRouter(prefix="/works/{work_id}/protagonists", tags=["protagonists"])


@router.get("", response_model=list[ProtagonistOut])
def list_protagonists(work_id: int, db: Session = Depends(get_db)):
    get_work_or_404(db, work_id)
    stmt = select(ProtagonistProfile).where(ProtagonistProfile.work_id == work_id)
    return list(db.scalars(stmt).all())


@router.post("", response_model=ProtagonistOut, status_code=status.HTTP_201_CREATED)
def create_protagonist(
    work_id: int,
    payload: ProtagonistCreate,
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
        raise HTTPException(
            status_code=409, detail="Character already has a protagonist profile"
        ) from None
    db.refresh(profile)
    return profile


@router.get("/{profile_id}", response_model=ProtagonistOut)
def get_protagonist(work_id: int, profile_id: int, db: Session = Depends(get_db)):
    return get_scoped_or_404(
        db,
        model=ProtagonistProfile,
        work_id=work_id,
        child_id=profile_id,
        label="Protagonist profile",
    )


@router.put("/{profile_id}", response_model=ProtagonistOut)
def update_protagonist(
    work_id: int,
    profile_id: int,
    payload: ProtagonistUpdate,
    db: Session = Depends(get_db),
):
    p = get_scoped_or_404(
        db,
        model=ProtagonistProfile,
        work_id=work_id,
        child_id=profile_id,
        label="Protagonist profile",
    )
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_protagonist(work_id: int, profile_id: int, db: Session = Depends(get_db)):
    p = get_scoped_or_404(
        db,
        model=ProtagonistProfile,
        work_id=work_id,
        child_id=profile_id,
        label="Protagonist profile",
    )
    db.delete(p)
    db.commit()
    return None