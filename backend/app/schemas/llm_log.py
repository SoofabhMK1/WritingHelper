from datetime import datetime
from typing import List, Literal, Optional

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
    work_id: Optional[int] = None
    status: LlmLogStatus
    duration_ms: int
    model: Optional[str] = None
    user_preview: str = ""
    response_preview: str = ""
    error: Optional[str] = None
    created_at: datetime


# ============================================================================
# Detail (single log) — full system / user / response
# ============================================================================


class LlmRequestLogDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    prompt_name: str
    endpoint: str
    work_id: Optional[int] = None
    system: str
    user: str
    response: Optional[str] = None
    status: LlmLogStatus
    error: Optional[str] = None
    duration_ms: int
    model: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ============================================================================
# List response — paginated
# ============================================================================


class LlmRequestLogList(BaseModel):
    items: List[LlmRequestLogSummary]
    total: int
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=200)
