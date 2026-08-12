from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.chapter import Chapter
from app.models.volume import Volume
from app.models.work import Work
from app.schemas.chapter import ChapterCreate, ChapterOut, ChapterUpdate

router = APIRouter(tags=["chapters"])


def _get_work_or_404(work_id: int, db: Session) -> Work:
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


def _get_chapter_or_404(chapter_id: int, work_id: int, db: Session) -> Chapter:
    ch = db.get(Chapter, chapter_id)
    if not ch or ch.work_id != work_id:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return ch


def _validate_volume(volume_id: Optional[int], work_id: int, db: Session) -> None:
    if volume_id is None:
        return
    vol = db.get(Volume, volume_id)
    if not vol or vol.work_id != work_id:
        raise HTTPException(status_code=400, detail="volume_id does not belong to work")


@router.get("/works/{work_id}/chapters", response_model=List[ChapterOut])
def list_chapters(
    work_id: int,
    volume_id: Optional[int] = Query(None),
    chapter_status: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    _get_work_or_404(work_id, db)
    stmt = select(Chapter).where(Chapter.work_id == work_id)
    if volume_id is not None:
        stmt = stmt.where(Chapter.volume_id == volume_id)
    if chapter_status is not None:
        stmt = stmt.where(Chapter.status == chapter_status)
    stmt = stmt.order_by(Chapter.volume_id.nulls_first(), Chapter.order_num, Chapter.id)
    return list(db.scalars(stmt).all())


@router.post("/works/{work_id}/chapters", response_model=ChapterOut, status_code=status.HTTP_201_CREATED)
def create_chapter(
    work_id: int,
    payload: ChapterCreate,
    db: Session = Depends(get_db),
):
    if payload.work_id != work_id:
        raise HTTPException(status_code=400, detail="work_id mismatch")
    _get_work_or_404(work_id, db)
    _validate_volume(payload.volume_id, work_id, db)
    ch = Chapter(**payload.model_dump())
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return ch


@router.get("/works/{work_id}/chapters/{chapter_id}", response_model=ChapterOut)
def get_chapter(work_id: int, chapter_id: int, db: Session = Depends(get_db)):
    return _get_chapter_or_404(chapter_id, work_id, db)


@router.put("/works/{work_id}/chapters/{chapter_id}", response_model=ChapterOut)
def update_chapter(
    work_id: int,
    chapter_id: int,
    payload: ChapterUpdate,
    db: Session = Depends(get_db),
):
    ch = _get_chapter_or_404(chapter_id, work_id, db)
    data = payload.model_dump(exclude_unset=True)
    if "volume_id" in data:
        _validate_volume(data["volume_id"], work_id, db)
    for key, value in data.items():
        setattr(ch, key, value)
    db.commit()
    db.refresh(ch)
    return ch


@router.delete("/works/{work_id}/chapters/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chapter(work_id: int, chapter_id: int, db: Session = Depends(get_db)):
    ch = _get_chapter_or_404(chapter_id, work_id, db)
    db.delete(ch)
    db.commit()
    return None