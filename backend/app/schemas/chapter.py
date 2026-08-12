from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ChapterBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    summary: Optional[str] = None
    outline: Optional[str] = None
    content: Optional[str] = None
    order_num: int = 0
    target_words: int = Field(0, ge=0)
    actual_words: int = Field(0, ge=0)
    status: str = "planning"
    chapter_type: str = "plot"
    mood: Optional[str] = Field(None, max_length=80)
    volume_id: Optional[int] = None


class ChapterCreate(ChapterBase):
    work_id: int


class ChapterUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    summary: Optional[str] = None
    outline: Optional[str] = None
    content: Optional[str] = None
    order_num: Optional[int] = None
    target_words: Optional[int] = Field(None, ge=0)
    actual_words: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None
    chapter_type: Optional[str] = None
    mood: Optional[str] = Field(None, max_length=80)
    volume_id: Optional[int] = None


class ChapterOut(ChapterBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_id: int
    created_at: datetime
    updated_at: datetime


class ChapterReorder(BaseModel):
    order_num: int = Field(..., ge=0)
    volume_id: Optional[int] = None