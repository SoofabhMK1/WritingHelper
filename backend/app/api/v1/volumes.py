from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.volume import Volume
from app.models.work import Work
from app.schemas.volume import VolumeCreate, VolumeOut, VolumeUpdate

router = APIRouter(prefix="/works/{work_id}/volumes", tags=["volumes"])


def _get_work_or_404(work_id: int, db: Session) -> Work:
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


@router.get("", response_model=List[VolumeOut])
def list_volumes(work_id: int, db: Session = Depends(get_db)):
    _get_work_or_404(work_id, db)
    stmt = (
        select(Volume)
        .where(Volume.work_id == work_id)
        .order_by(Volume.order_num, Volume.id)
    )
    return list(db.scalars(stmt).all())


@router.post("", response_model=VolumeOut, status_code=status.HTTP_201_CREATED)
def create_volume(
    work_id: int,
    payload: VolumeCreate,
    db: Session = Depends(get_db),
):
    _get_work_or_404(work_id, db)
    vol = Volume(work_id=work_id, **payload.model_dump())
    db.add(vol)
    db.commit()
    db.refresh(vol)
    return vol


@router.get("/{volume_id}", response_model=VolumeOut)
def get_volume(work_id: int, volume_id: int, db: Session = Depends(get_db)):
    vol = db.get(Volume, volume_id)
    if not vol or vol.work_id != work_id:
        raise HTTPException(status_code=404, detail="Volume not found")
    return vol


@router.put("/{volume_id}", response_model=VolumeOut)
def update_volume(
    work_id: int,
    volume_id: int,
    payload: VolumeUpdate,
    db: Session = Depends(get_db),
):
    vol = db.get(Volume, volume_id)
    if not vol or vol.work_id != work_id:
        raise HTTPException(status_code=404, detail="Volume not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(vol, key, value)
    db.commit()
    db.refresh(vol)
    return vol


@router.delete("/{volume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_volume(work_id: int, volume_id: int, db: Session = Depends(get_db)):
    vol = db.get(Volume, volume_id)
    if not vol or vol.work_id != work_id:
        raise HTTPException(status_code=404, detail="Volume not found")
    db.delete(vol)
    db.commit()
    return None