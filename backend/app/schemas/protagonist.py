from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProtagonistBase(BaseModel):
    core_conflict: Optional[str] = None
    external_goal: Optional[str] = None
    internal_goal: Optional[str] = None
    ghost: Optional[str] = None
    wound: Optional[str] = None
    lie_believed: Optional[str] = None
    truth_needed: Optional[str] = None
    arc_summary: Optional[str] = None
    key_relationships: Optional[str] = None
    special_abilities: Optional[str] = None
    pov_label: Optional[str] = Field(None, max_length=40)


class ProtagonistCreate(ProtagonistBase):
    character_id: int


class ProtagonistUpdate(ProtagonistBase):
    pass


class ProtagonistOut(ProtagonistBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_id: int
    character_id: int
    created_at: datetime
    updated_at: datetime