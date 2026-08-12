from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class WorkBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    subtitle: Optional[str] = Field(None, max_length=200)
    genre: Optional[str] = Field(None, max_length=80)
    style: Optional[str] = Field(None, max_length=80)
    pov: Optional[str] = Field(None, max_length=40)
    description: Optional[str] = None
    target_words: int = Field(0, ge=0)
    status: str = "draft"
    cover: Optional[str] = None
    notes: Optional[str] = None


class WorkCreate(WorkBase):
    pass


class WorkUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    subtitle: Optional[str] = Field(None, max_length=200)
    genre: Optional[str] = Field(None, max_length=80)
    style: Optional[str] = Field(None, max_length=80)
    pov: Optional[str] = Field(None, max_length=40)
    description: Optional[str] = None
    target_words: Optional[int] = Field(None, ge=0)
    current_words: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None
    cover: Optional[str] = None
    notes: Optional[str] = None


class WorkOut(WorkBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    current_words: int
    created_at: datetime
    updated_at: datetime