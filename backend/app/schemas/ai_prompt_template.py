"""Pydantic schemas for the prompt template binding feature.

A *binding* maps an AI prompt name (e.g. ``continue``) to a saved
:class:`PromptAssembly`. When the binding is ``None``, the call uses the
built-in template registered in ``app.ai.prompts.PROMPTS``.

A *clone* request creates a new assembly seeded from the body of a
built-in prompt so the user can edit it freely.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# ============================================================================
# Binding
# ============================================================================

class AIPromptTemplateBindingOut(BaseModel):
    """One row of the binding table — prompt name → assembly id (or null)."""

    model_config = ConfigDict(from_attributes=True)

    prompt_name: str
    assembly_id: int | None = None
    updated_at: datetime


class AIPromptTemplateBindingsOut(BaseModel):
    """Bulk-read shape used by the UI to render the assignment table.

    ``bindings`` mirrors the dict shape used by ``ai_prompt_assignments``
    so the frontend can build an O(1) lookup.
    """

    bindings: dict[str, int | None]


class AIPromptTemplateBindingUpdate(BaseModel):
    """PATCH-style payload. ``assembly_id=None`` resets to the built-in."""

    assembly_id: int | None = Field(
        None,
        description=(
            "Target prompt_assemblies.id; pass null to use the built-in "
            "template."
        ),
    )


class AIBuiltInPromptSummary(BaseModel):
    """Lightweight summary of a registered built-in prompt."""

    name: str
    json_mode: bool
    temperature: float


class AIBuiltInPromptDetail(AIBuiltInPromptSummary):
    """Full body of a built-in prompt (used by the clone modal preview)."""

    system: str
    user_template: str


# ============================================================================
# Clone (built-in → new assembly)
# ============================================================================

class AIClonePromptRequest(BaseModel):
    """Request body for ``POST /ai/prompts/{name}/clone``."""

    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = None
