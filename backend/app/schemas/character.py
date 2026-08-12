from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CharacterBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    aliases: Optional[str] = Field(None, max_length=500)
    role: str = "side"
    age: Optional[int] = Field(None, ge=0, le=9999)
    gender: Optional[str] = Field(None, max_length=40)
    appearance: Optional[str] = None
    personality: Optional[str] = None
    background: Optional[str] = None
    motivation: Optional[str] = None
    arc: Optional[str] = None
    speech_style: Optional[str] = None
    ability: Optional[str] = None
    occupation: Optional[str] = Field(None, max_length=120)
    notes: Optional[str] = None
    avatar: Optional[str] = Field(None, max_length=500)


class CharacterCreate(CharacterBase):
    pass


class CharacterUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    aliases: Optional[str] = Field(None, max_length=500)
    role: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=9999)
    gender: Optional[str] = Field(None, max_length=40)
    appearance: Optional[str] = None
    personality: Optional[str] = None
    background: Optional[str] = None
    motivation: Optional[str] = None
    arc: Optional[str] = None
    speech_style: Optional[str] = None
    ability: Optional[str] = None
    occupation: Optional[str] = Field(None, max_length=120)
    notes: Optional[str] = None
    avatar: Optional[str] = Field(None, max_length=500)


class CharacterOut(CharacterBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_id: int
    created_at: datetime
    updated_at: datetime