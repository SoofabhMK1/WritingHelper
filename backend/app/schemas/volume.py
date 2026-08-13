from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class VolumeBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    summary: str | None = None
    order_num: int = 0
    status: str = "planning"
    target_words: int = Field(0, ge=0)


class VolumeCreate(VolumeBase):
    pass


class VolumeUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    summary: str | None = None
    order_num: int | None = None
    status: str | None = None
    target_words: int | None = Field(None, ge=0)


class VolumeOut(VolumeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_id: int
    created_at: datetime
    updated_at: datetime


class VolumeReorder(BaseModel):
    """Move a volume to a specific position among its work's siblings."""
    order_num: int = Field(..., ge=0)