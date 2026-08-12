from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class StateBase(BaseModel):
    character_id: int
    chapter_id: Optional[int] = None
    state_type: str = "status"
    state_key: str = Field(..., min_length=1, max_length=80)
    state_value: str = Field(..., min_length=1, max_length=500)
    note: Optional[str] = None
    captured_at: Optional[str] = Field(None, max_length=40)


class StateCreate(StateBase):
    pass


class StateUpdate(BaseModel):
    chapter_id: Optional[int] = None
    state_type: Optional[str] = None
    state_key: Optional[str] = Field(None, min_length=1, max_length=80)
    state_value: Optional[str] = Field(None, min_length=1, max_length=500)
    note: Optional[str] = None
    captured_at: Optional[str] = Field(None, max_length=40)


class StateOut(StateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_id: int
    created_at: datetime
    updated_at: datetime


class StateGroupedByCharacter(BaseModel):
    character_id: int
    character_name: str
    states: list[StateOut]