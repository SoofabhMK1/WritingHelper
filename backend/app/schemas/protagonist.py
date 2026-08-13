from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProtagonistBase(BaseModel):
    core_conflict: str | None = None
    external_goal: str | None = None
    internal_goal: str | None = None
    ghost: str | None = None
    wound: str | None = None
    lie_believed: str | None = None
    truth_needed: str | None = None
    arc_summary: str | None = None
    key_relationships: str | None = None
    special_abilities: str | None = None
    pov_label: str | None = Field(None, max_length=40)


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