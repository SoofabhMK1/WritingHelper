from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChapterBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    summary: str | None = None
    outline: str | None = None
    content: str | None = None
    order_num: int = 0
    target_words: int = Field(0, ge=0)
    actual_words: int = Field(0, ge=0)
    status: str = "planning"
    chapter_type: str = "plot"
    mood: str | None = Field(None, max_length=80)
    volume_id: int | None = None


class ChapterCreate(ChapterBase):
    work_id: int


class ChapterUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    summary: str | None = None
    outline: str | None = None
    content: str | None = None
    order_num: int | None = None
    target_words: int | None = Field(None, ge=0)
    actual_words: int | None = Field(None, ge=0)
    status: str | None = None
    chapter_type: str | None = None
    mood: str | None = Field(None, max_length=80)
    volume_id: int | None = None


class ChapterOut(ChapterBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_id: int
    created_at: datetime
    updated_at: datetime


class ChapterReorder(BaseModel):
    order_num: int = Field(..., ge=0)
    volume_id: int | None = None