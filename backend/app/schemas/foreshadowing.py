from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ForeshadowBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    quote: str | None = None
    chapter_id: int | None = None
    planted_chapter_id: int | None = None
    payoff_chapter_id: int | None = None
    status: str = "open"


class ForeshadowCreate(ForeshadowBase):
    pass


class ForeshadowUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    quote: str | None = None
    chapter_id: int | None = None
    planted_chapter_id: int | None = None
    payoff_chapter_id: int | None = None
    status: str | None = None


class ForeshadowOut(ForeshadowBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_id: int
    created_at: datetime
    updated_at: datetime