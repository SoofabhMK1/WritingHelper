from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    event_type: str = "main"
    story_time: str | None = Field(None, max_length=120)
    location: str | None = Field(None, max_length=120)
    importance: int = Field(3, ge=1, le=5)
    status: str = "planned"
    chapter_id: int | None = None
    notes: str | None = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    event_type: str | None = None
    story_time: str | None = Field(None, max_length=120)
    location: str | None = Field(None, max_length=120)
    importance: int | None = Field(None, ge=1, le=5)
    status: str | None = None
    chapter_id: int | None = None
    notes: str | None = None


class EventOut(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_id: int
    created_at: datetime
    updated_at: datetime


class EventCharacterIn(BaseModel):
    character_id: int
    role: str = "participant"
    note: str | None = Field(None, max_length=500)


class EventCharacterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    character_id: int
    role: str
    note: str | None = None


class EventLinkIn(BaseModel):
    source_event_id: int
    target_event_id: int
    link_type: str = "causes"
    note: str | None = Field(None, max_length=500)


class EventLinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_id: int
    source_event_id: int
    target_event_id: int
    link_type: str
    note: str | None = None


class EventWithRelations(EventOut):
    character_links: list[EventCharacterOut] = []
    links_out: list[EventLinkOut] = []
    links_in: list[EventLinkOut] = []