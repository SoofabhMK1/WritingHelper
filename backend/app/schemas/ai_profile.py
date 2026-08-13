from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AIProfileBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=40)
    provider: str = Field("openai", max_length=40)
    base_url: str = Field(..., min_length=1, max_length=200)
    model: str = Field(..., min_length=1, max_length=80)
    temperature: float = Field(0.7, ge=0, le=2)


class AIProfileCreate(AIProfileBase):
    api_key: str | None = None
    is_default: bool = False


class AIProfileUpdate(BaseModel):
    """Partial update. Use ``api_key=""`` to clear, ``None`` to leave."""

    name: str | None = Field(None, min_length=1, max_length=40)
    provider: str | None = Field(None, max_length=40)
    base_url: str | None = Field(None, min_length=1, max_length=200)
    model: str | None = Field(None, min_length=1, max_length=80)
    temperature: float | None = Field(None, ge=0, le=2)
    api_key: str | None = None
    is_default: bool | None = None


class AIProfileOut(BaseModel):
    """Full shape (admin / editor view). API key is never returned."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    provider: str
    base_url: str
    model: str
    temperature: float
    is_default: bool
    has_api_key: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AIProfileSummary(BaseModel):
    """Lighter shape used in /ai/status list."""

    id: int
    name: str
    provider: str
    model: str
    is_default: bool
    has_api_key: bool


class AssignmentMap(BaseModel):
    """``prompt_name -> profile_id`` (null means "use default")."""

    assignments: dict[str, int | None] = Field(default_factory=dict)


class AssignmentUpdate(BaseModel):
    profile_id: int | None = None


class AIStatusOut(BaseModel):
    """Returned by ``GET /ai/status``.

    ``base_url`` / ``model`` / ``temperature`` mirror the values that
    would be used for the *next* call without a specific prompt mapping
    (i.e. the default profile's config, or the legacy fallback).
    """

    configured: bool
    base_url: str = ""
    model: str = ""
    temperature: float = 0.0
    provider: str = ""
    default_profile_id: int | None = None
    default_profile_name: str | None = None
    profiles: list[AIProfileSummary] = Field(default_factory=list)
    assignments: dict[str, int | None] = Field(default_factory=dict)