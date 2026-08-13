from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CharacterBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    aliases: str | None = Field(None, max_length=500)
    role: str = "side"
    age: int | None = Field(None, ge=0, le=9999)
    gender: str | None = Field(None, max_length=40)
    appearance: str | None = None
    personality: str | None = None
    background: str | None = None
    motivation: str | None = None
    arc: str | None = None
    speech_style: str | None = None
    ability: str | None = None
    occupation: str | None = Field(None, max_length=120)
    notes: str | None = None
    avatar: str | None = Field(None, max_length=500)


class CharacterCreate(CharacterBase):
    pass


class CharacterUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    aliases: str | None = Field(None, max_length=500)
    role: str | None = None
    age: int | None = Field(None, ge=0, le=9999)
    gender: str | None = Field(None, max_length=40)
    appearance: str | None = None
    personality: str | None = None
    background: str | None = None
    motivation: str | None = None
    arc: str | None = None
    speech_style: str | None = None
    ability: str | None = None
    occupation: str | None = Field(None, max_length=120)
    notes: str | None = None
    avatar: str | None = Field(None, max_length=500)


class CharacterOut(CharacterBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_id: int
    created_at: datetime
    updated_at: datetime