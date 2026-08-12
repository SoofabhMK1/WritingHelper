from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import settings as settings_service

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingOut(BaseModel):
    key: str
    value: str = ""
    is_secret: bool = False
    is_set: bool = False
    updated_at: Optional[str] = None


class SettingUpdate(BaseModel):
    value: str = Field(..., min_length=1)


@router.get("", response_model=List[SettingOut])
def list_settings(db: Session = Depends(get_db)):
    return settings_service.list_settings(db)


@router.get("/{key}", response_model=SettingOut)
def get_setting(key: str, db: Session = Depends(get_db)):
    rows = {r["key"]: r for r in settings_service.list_settings(db)}
    if key not in rows:
        raise HTTPException(status_code=404, detail="Setting not found")
    return rows[key]


@router.put("/{key}", response_model=SettingOut)
def upsert_setting(key: str, payload: SettingUpdate, db: Session = Depends(get_db)):
    settings_service.set_setting(db, key, payload.value)
    rows = {r["key"]: r for r in settings_service.list_settings(db)}
    return rows[key]


@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
def remove_setting(key: str, db: Session = Depends(get_db)):
    if not settings_service.delete_setting(db, key):
        raise HTTPException(status_code=404, detail="Setting not found")
    return None