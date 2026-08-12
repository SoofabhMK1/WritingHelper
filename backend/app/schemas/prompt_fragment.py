from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PromptFragmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    body: str = ""
    description: Optional[str] = None
    tags_json: Optional[str] = None


class PromptFragmentCreate(PromptFragmentBase):
    pass


class PromptFragmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    body: Optional[str] = None
    description: Optional[str] = None
    tags_json: Optional[str] = None


class PromptFragmentOut(PromptFragmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime