from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class EventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    event_type: str = "main"
    story_time: Optional[str] = Field(None, max_length=120)
    location: Optional[str] = Field(None, max_length=120)
    importance: int = Field(3, ge=1, le=5)
    status: str = "planned"
    chapter_id: Optional[int] = None
    notes: Optional[str] = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    event_type: Optional[str] = None
    story_time: Optional[str] = Field(None, max_length=120)
    location: Optional[str] = Field(None, max_length=120)
    importance: Optional[int] = Field(None, ge=1, le=5)
    status: Optional[str] = None
    chapter_id: Optional[int] = None
    notes: Optional[str] = None


class EventOut(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_id: int
    created_at: datetime
    updated_at: datetime


class EventCharacterIn(BaseModel):
    character_id: int
    role: str = "participant"
    note: Optional[str] = Field(None, max_length=500)


class EventCharacterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    character_id: int
    role: str
    note: Optional[str] = None


class EventLinkIn(BaseModel):
    source_event_id: int
    target_event_id: int
    link_type: str = "causes"
    note: Optional[str] = Field(None, max_length=500)


class EventLinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_id: int
    source_event_id: int
    target_event_id: int
    link_type: str
    note: Optional[str] = None


class EventWithRelations(EventOut):
    character_links: List[EventCharacterOut] = []
    links_out: List[EventLinkOut] = []
    links_in: List[EventLinkOut] = []