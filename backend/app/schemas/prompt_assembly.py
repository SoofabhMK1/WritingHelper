from datetime import datetime
from json import loads as _json_loads
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

# ============================================================================
# Part — discriminated union over `type`
# ============================================================================

class FragmentPart(BaseModel):
    type: Literal["fragment"]
    fragment_id: int = Field(..., ge=1)


class BuiltinPart(BaseModel):
    type: Literal["builtin"]
    prompt_name: str = Field(..., min_length=1, max_length=80)
    slot: Literal["system", "user_template"] = "user_template"


class TextPart(BaseModel):
    type: Literal["text"]
    body: str = ""


class VariablePart(BaseModel):
    type: Literal["variable"]
    name: str = Field(..., min_length=1, max_length=120)


Part = Annotated[
    FragmentPart | BuiltinPart | TextPart | VariablePart,
    Field(discriminator="type"),
]


# ============================================================================
# Assembly
# ============================================================================

class PromptAssemblyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = None
    system_parts: list[Part] = Field(default_factory=list)
    user_parts: list[Part] = Field(default_factory=list)
    sample_vars: dict[str, Any] = Field(default_factory=dict)


class PromptAssemblyCreate(PromptAssemblyBase):
    pass


class PromptAssemblyUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    description: str | None = None
    system_parts: list[Part] | None = None
    user_parts: list[Part] | None = None
    sample_vars: dict[str, Any] | None = None


class PromptAssemblyOut(PromptAssemblyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def _decode_json_columns(cls, data: Any) -> Any:
        """Translate the ORM's `*_json` text columns into typed fields.

        With `from_attributes=True`, Pydantic looks up `system_parts` etc. on
        the source object — but the ORM only has `system_parts_json` (a JSON
        string). This validator runs first and maps the columns.
        """
        if data is None:
            return data
        if hasattr(data, "system_parts_json"):
            return {
                "name": data.name,
                "description": data.description,
                "system_parts": _json_loads(data.system_parts_json or "[]"),
                "user_parts": _json_loads(data.user_parts_json or "[]"),
                "sample_vars": _json_loads(data.sample_vars_json or "{}"),
                "id": data.id,
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
        return data


# ============================================================================
# Render
# ============================================================================

class AssemblyRenderRequest(BaseModel):
    variables: dict[str, Any] = Field(default_factory=dict)


class AssemblyRenderResult(BaseModel):
    system: str
    user: str