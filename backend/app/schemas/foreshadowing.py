from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ForeshadowBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    quote: Optional[str] = None
    chapter_id: Optional[int] = None
    planted_chapter_id: Optional[int] = None
    payoff_chapter_id: Optional[int] = None
    status: str = "open"


class ForeshadowCreate(ForeshadowBase):
    pass


class ForeshadowUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    quote: Optional[str] = None
    chapter_id: Optional[int] = None
    planted_chapter_id: Optional[int] = None
    payoff_chapter_id: Optional[int] = None
    status: Optional[str] = None


class ForeshadowOut(ForeshadowBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_id: int
    created_at: datetime
    updated_at: datetime