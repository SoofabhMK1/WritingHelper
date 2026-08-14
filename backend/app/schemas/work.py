from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WorkBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    subtitle: str | None = Field(None, max_length=200)
    genre: str | None = Field(None, max_length=80)
    style: str | None = Field(None, max_length=80)
    pov: str | None = Field(None, max_length=40)
    description: str | None = None
    target_words: int = Field(0, ge=0)
    status: str = "draft"
    cover: str | None = None
    notes: str | None = None
    story_seed: str | None = None
    core_conflict: str | None = None
    protagonist_goal: str | None = None
    themes: list[str] | None = None
    era: str | None = Field(None, max_length=40)
    setting: str | None = None
    world_rules: str | None = None
    pace: int | None = Field(None, ge=1, le=10)
    realism: int | None = Field(None, ge=1, le=10)
    prose: int | None = Field(None, ge=1, le=10)
    moods: list[str] | None = None
    length_type: str | None = Field(None, max_length=20)
    stage: str | None = Field(None, max_length=40)


class WorkCreate(WorkBase):
    pass


class WorkUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    subtitle: str | None = Field(None, max_length=200)
    genre: str | None = Field(None, max_length=80)
    style: str | None = Field(None, max_length=80)
    pov: str | None = Field(None, max_length=40)
    description: str | None = None
    target_words: int | None = Field(None, ge=0)
    current_words: int | None = Field(None, ge=0)
    status: str | None = None
    cover: str | None = None
    notes: str | None = None
    story_seed: str | None = None
    core_conflict: str | None = None
    protagonist_goal: str | None = None
    themes: list[str] | None = None
    era: str | None = Field(None, max_length=40)
    setting: str | None = None
    world_rules: str | None = None
    pace: int | None = Field(None, ge=1, le=10)
    realism: int | None = Field(None, ge=1, le=10)
    prose: int | None = Field(None, ge=1, le=10)
    moods: list[str] | None = None
    length_type: str | None = Field(None, max_length=20)
    stage: str | None = Field(None, max_length=40)


class WorkOut(WorkBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    current_words: int
    created_at: datetime
    updated_at: datetime