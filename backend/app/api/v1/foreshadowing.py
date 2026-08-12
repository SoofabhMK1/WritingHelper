from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.chapter import Chapter
from app.models.foreshadowing import Foreshadowing
from app.models.work import Work
from app.schemas.foreshadowing import (
    ForeshadowCreate,
    ForeshadowOut,
    ForeshadowUpdate,
)

router = APIRouter(prefix="/works/{work_id}/foreshadowing", tags=["foreshadowing"])


def _get_work_or_404(work_id: int, db: Session) -> Work:
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


def _get_foreshadow_or_404(fs_id: int, work_id: int, db: Session) -> Foreshadowing:
    fs = db.get(Foreshadowing, fs_id)
    if not fs or fs.work_id != work_id:
        raise HTTPException(status_code=404, detail="Foreshadowing not found")
    return fs


def _validate_chapter(chapter_id: Optional[int], work_id: int, db: Session) -> None:
    if chapter_id is None:
        return
    ch = db.get(Chapter, chapter_id)
    if not ch or ch.work_id != work_id:
        raise HTTPException(status_code=400, detail="chapter_id does not belong to work")


@router.get("", response_model=List[ForeshadowOut])
def list_foreshadow(
    work_id: int,
    fs_status: Optional[str] = Query(None, alias="status"),
    chapter_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    _get_work_or_404(work_id, db)
    stmt = select(Foreshadowing).where(Foreshadowing.work_id == work_id)
    if fs_status:
        stmt = stmt.where(Foreshadowing.status == fs_status)
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
    _get_work_or_404(work_id, db)
    _validate_chapter(payload.chapter_id, work_id, db)
    _validate_chapter(payload.planted_chapter_id, work_id, db)
    _validate_chapter(payload.payoff_chapter_id, work_id, db)
    fs = Foreshadowing(work_id=work_id, **payload.model_dump())
    db.add(fs)
    db.commit()
    db.refresh(fs)
    return fs


@router.get("/{fs_id}", response_model=ForeshadowOut)
def get_foreshadow(work_id: int, fs_id: int, db: Session = Depends(get_db)):
    return _get_foreshadow_or_404(fs_id, work_id, db)


@router.put("/{fs_id}", response_model=ForeshadowOut)
def update_foreshadow(
    work_id: int,
    fs_id: int,
    payload: ForeshadowUpdate,
    db: Session = Depends(get_db),
):
    fs = _get_foreshadow_or_404(fs_id, work_id, db)
    data = payload.model_dump(exclude_unset=True)
    for k in ("chapter_id", "planted_chapter_id", "payoff_chapter_id"):
        if k in data:
            _validate_chapter(data[k], work_id, db)
    for k, v in data.items():
        setattr(fs, k, v)
    db.commit()
    db.refresh(fs)
    return fs


@router.delete("/{fs_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_foreshadow(work_id: int, fs_id: int, db: Session = Depends(get_db)):
    fs = _get_foreshadow_or_404(fs_id, work_id, db)
    db.delete(fs)
    db.commit()
    return None