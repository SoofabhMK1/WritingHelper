
from pydantic import BaseModel, ConfigDict, Field


class SettingOut(BaseModel):
    """Single setting row returned by ``GET /settings``.

    Secrets (``ai.api_key``) are returned as ``value=""``; consumers should
    only check ``is_set``.
    """

    model_config = ConfigDict(from_attributes=True)

    key: str = Field(..., max_length=120)
    value: str = ""
    is_secret: bool = False
    is_set: bool = False
    updated_at: str | None = None