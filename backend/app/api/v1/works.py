from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.work import Work
from app.schemas.work import WorkCreate, WorkOut, WorkUpdate

router = APIRouter(prefix="/works", tags=["works"])


@router.get("", response_model=List[WorkOut])
def list_works(
    q: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Work).order_by(Work.updated_at.desc())
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Work.title.ilike(like))
    if status:
        stmt = stmt.where(Work.status == status)
    return list(db.scalars(stmt).all())


@router.post("", response_model=WorkOut, status_code=status.HTTP_201_CREATED)
def create_work(payload: WorkCreate, db: Session = Depends(get_db)):
    work = Work(**payload.model_dump())
    db.add(work)
    db.commit()
    db.refresh(work)
    return work


@router.get("/{work_id}", response_model=WorkOut)
def get_work(work_id: int, db: Session = Depends(get_db)):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


@router.put("/{work_id}", response_model=WorkOut)
def update_work(
    work_id: int,
    payload: WorkUpdate,
    db: Session = Depends(get_db),
):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(work, key, value)
    db.commit()
    db.refresh(work)
    return work


@router.delete("/{work_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work(work_id: int, db: Session = Depends(get_db)):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    db.delete(work)
    db.commit()
    return None