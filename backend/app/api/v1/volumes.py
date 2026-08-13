
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.deps import get_scoped_or_404, get_work_or_404
from app.database import get_db
from app.models.volume import Volume
from app.schemas.volume import VolumeCreate, VolumeOut, VolumeUpdate

router = APIRouter(prefix="/works/{work_id}/volumes", tags=["volumes"])


@router.get("", response_model=list[VolumeOut])
def list_volumes(work_id: int, db: Session = Depends(get_db)):
    get_work_or_404(db, work_id)
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
    get_work_or_404(db, work_id)
    vol = Volume(work_id=work_id, **payload.model_dump())
    db.add(vol)
    db.commit()
    db.refresh(vol)
    return vol


@router.get("/{volume_id}", response_model=VolumeOut)
def get_volume(work_id: int, volume_id: int, db: Session = Depends(get_db)):
    return get_scoped_or_404(
        db, model=Volume, work_id=work_id, child_id=volume_id, label="Volume"
    )


@router.put("/{volume_id}", response_model=VolumeOut)
def update_volume(
    work_id: int,
    volume_id: int,
    payload: VolumeUpdate,
    db: Session = Depends(get_db),
):
    vol = get_scoped_or_404(
        db, model=Volume, work_id=work_id, child_id=volume_id, label="Volume"
    )
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(vol, key, value)
    db.commit()
    db.refresh(vol)
    return vol


@router.delete("/{volume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_volume(work_id: int, volume_id: int, db: Session = Depends(get_db)):
    vol = get_scoped_or_404(
        db, model=Volume, work_id=work_id, child_id=volume_id, label="Volume"
    )
    db.delete(vol)
    db.commit()
    return None