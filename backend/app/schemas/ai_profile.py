from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AIProfileBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=40)
    provider: str = Field("openai", max_length=40)
    base_url: str = Field(..., min_length=1, max_length=200)
    model: str = Field(..., min_length=1, max_length=80)
    temperature: float = Field(0.7, ge=0, le=2)


class AIProfileCreate(AIProfileBase):
    api_key: Optional[str] = None
    is_default: bool = False


class AIProfileUpdate(BaseModel):
    """Partial update. Use ``api_key=""`` to clear, ``None`` to leave."""

    name: Optional[str] = Field(None, min_length=1, max_length=40)
    provider: Optional[str] = Field(None, max_length=40)
    base_url: Optional[str] = Field(None, min_length=1, max_length=200)
    model: Optional[str] = Field(None, min_length=1, max_length=80)
    temperature: Optional[float] = Field(None, ge=0, le=2)
    api_key: Optional[str] = None
    is_default: Optional[bool] = None


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
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


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

    assignments: dict[str, Optional[int]] = Field(default_factory=dict)


class AssignmentUpdate(BaseModel):
    profile_id: Optional[int] = None


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
    default_profile_id: Optional[int] = None
    default_profile_name: Optional[str] = None
    profiles: list[AIProfileSummary] = Field(default_factory=list)
    assignments: dict[str, Optional[int]] = Field(default_factory=dict)