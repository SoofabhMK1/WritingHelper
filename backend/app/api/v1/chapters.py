
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.deps import (
    get_scoped_or_404,
    get_work_or_404,
    validate_child_belongs_to_work,
)
from app.database import get_db
from app.models.chapter import Chapter
from app.models.volume import Volume
from app.schemas.chapter import ChapterCreate, ChapterOut, ChapterUpdate

router = APIRouter(prefix="/works/{work_id}/chapters", tags=["chapters"])


@router.get("", response_model=list[ChapterOut])
def list_chapters(
    work_id: int,
    volume_id: int | None = Query(None),
    status: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    get_work_or_404(db, work_id)
    stmt = select(Chapter).where(Chapter.work_id == work_id)
    if volume_id is not None:
        stmt = stmt.where(Chapter.volume_id == volume_id)
    if status is not None:
        stmt = stmt.where(Chapter.status == status)
    stmt = stmt.order_by(Chapter.volume_id.nulls_first(), Chapter.order_num, Chapter.id)
    return list(db.scalars(stmt).all())


@router.post("", response_model=ChapterOut, status_code=status.HTTP_201_CREATED)
def create_chapter(
    work_id: int,
    payload: ChapterCreate,
    db: Session = Depends(get_db),
):
    if payload.work_id != work_id:
        raise HTTPException(status_code=400, detail="work_id mismatch")
    get_work_or_404(db, work_id)
    validate_child_belongs_to_work(
        db, model=Volume, work_id=work_id, child_id=payload.volume_id, label="volume_id"
    )
    ch = Chapter(**payload.model_dump())
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return ch


@router.get("/{chapter_id}", response_model=ChapterOut)
def get_chapter(work_id: int, chapter_id: int, db: Session = Depends(get_db)):
    return get_scoped_or_404(
        db, model=Chapter, work_id=work_id, child_id=chapter_id, label="Chapter"
    )


@router.put("/{chapter_id}", response_model=ChapterOut)
def update_chapter(
    work_id: int,
    chapter_id: int,
    payload: ChapterUpdate,
    db: Session = Depends(get_db),
):
    ch = get_scoped_or_404(
        db, model=Chapter, work_id=work_id, child_id=chapter_id, label="Chapter"
    )
    data = payload.model_dump(exclude_unset=True)
    if "volume_id" in data:
        validate_child_belongs_to_work(
            db,
            model=Volume,
            work_id=work_id,
            child_id=data["volume_id"],
            label="volume_id",
        )
    for key, value in data.items():
        setattr(ch, key, value)
    db.commit()
    db.refresh(ch)
    return ch


@router.delete("/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chapter(work_id: int, chapter_id: int, db: Session = Depends(get_db)):
    ch = get_scoped_or_404(
        db, model=Chapter, work_id=work_id, child_id=chapter_id, label="Chapter"
    )
    db.delete(ch)
    db.commit()
    return None