from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PromptFragmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    body: str = ""
    description: str | None = None


class PromptFragmentCreate(PromptFragmentBase):
    pass


class PromptFragmentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    body: str | None = None
    description: str | None = None


class PromptFragmentOut(PromptFragmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime