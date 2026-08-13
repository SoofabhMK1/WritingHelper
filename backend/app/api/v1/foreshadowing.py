
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
from app.models.foreshadowing import Foreshadowing
from app.schemas.foreshadowing import (
    ForeshadowCreate,
    ForeshadowOut,
    ForeshadowUpdate,
)

router = APIRouter(prefix="/works/{work_id}/foreshadowing", tags=["foreshadowing"])


@router.get("", response_model=list[ForeshadowOut])
def list_foreshadow(
    work_id: int,
    status: str | None = Query(None, alias="status"),
    chapter_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    get_work_or_404(db, work_id)
    stmt = select(Foreshadowing).where(Foreshadowing.work_id == work_id)
    if status:
        stmt = stmt.where(Foreshadowing.status == status)
    if chapter_id is not None:
        stmt = stmt.where(
            (Foreshadowing.chapter_id == chapter_id)
            | (Foreshadowing.planted_chapter_id == chapter_id)
            | (Foreshadowing.payoff_chapter_id == chapter_id)
        )
    stmt = stmt.order_by(Foreshadowing.status, Foreshadowing.id)
    return list(db.scalars(stmt).all())


@router.post("", response_model=ForeshadowOut, status_code=status.HTTP_201_CREATED)
def create_foreshadow(
    work_id: int,
    payload: ForeshadowCreate,
    db: Session = Depends(get_db),
):
    get_work_or_404(db, work_id)
    for label in ("chapter_id", "planted_chapter_id", "payoff_chapter_id"):
        validate_child_belongs_to_work(
            db,
            model=Chapter,
            work_id=work_id,
            child_id=getattr(payload, label),
            label=label,
        )
    fs = Foreshadowing(work_id=work_id, **payload.model_dump())
    db.add(fs)
    db.commit()
    db.refresh(fs)
    return fs


@router.get("/{fs_id}", response_model=ForeshadowOut)
def get_foreshadow(work_id: int, fs_id: int, db: Session = Depends(get_db)):
    return get_scoped_or_404(
        db,
        model=Foreshadowing,
        work_id=work_id,
        child_id=fs_id,
        label="Foreshadowing",
    )


@router.put("/{fs_id}", response_model=ForeshadowOut)
def update_foreshadow(
    work_id: int,
    fs_id: int,
    payload: ForeshadowUpdate,
    db: Session = Depends(get_db),
):
    fs = get_scoped_or_404(
        db,
        model=Foreshadowing,
        work_id=work_id,
        child_id=fs_id,
        label="Foreshadowing",
    )
    data = payload.model_dump(exclude_unset=True)
    for k in ("chapter_id", "planted_chapter_id", "payoff_chapter_id"):
        if k in data:
            validate_child_belongs_to_work(
                db, model=Chapter, work_id=work_id, child_id=data[k], label=k
            )
    for k, v in data.items():
        setattr(fs, k, v)
    db.commit()
    db.refresh(fs)
    return fs


@router.delete("/{fs_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_foreshadow(work_id: int, fs_id: int, db: Session = Depends(get_db)):
    fs = get_scoped_or_404(
        db,
        model=Foreshadowing,
        work_id=work_id,
        child_id=fs_id,
        label="Foreshadowing",
    )
    db.delete(fs)
    db.commit()
    return None