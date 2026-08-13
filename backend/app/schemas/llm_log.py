from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# ============================================================================
# Status enum
# ============================================================================

LlmLogStatus = Literal["ok", "not_configured", "error"]


# ============================================================================
# Summary (list view) — truncates user/response previews
# ============================================================================


class LlmRequestLogSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    prompt_name: str
    endpoint: str
    work_id: int | None = None
    status: LlmLogStatus
    duration_ms: int
    model: str | None = None
    provider: str | None = None
    profile_id: int | None = None
    prompt_assembly_id: int | None = None
    user_preview: str = ""
    response_preview: str = ""
    error: str | None = None
    created_at: datetime


# ============================================================================
# Detail (single log) — full system / user / response
# ============================================================================


class LlmRequestLogDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    prompt_name: str
    endpoint: str
    work_id: int | None = None
    system: str
    user: str
    response: str | None = None
    status: LlmLogStatus
    error: str | None = None
    duration_ms: int
    model: str | None = None
    provider: str | None = None
    profile_id: int | None = None
    prompt_assembly_id: int | None = None
    created_at: datetime
    updated_at: datetime


# ============================================================================
# List response — paginated
# ============================================================================


class LlmRequestLogList(BaseModel):
    items: list[LlmRequestLogSummary]
    total: int
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=200)