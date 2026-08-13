"""Service for AI prompt → prompt_assembly bindings.

A *binding* maps a registered AI prompt name (e.g. ``continue``) to an
optional :class:`PromptAssembly`. When the binding is unset the call
falls back to the built-in template registered in
``app.ai.prompts.PROMPTS``.

The :func:`resolve_prompt` helper is the single point that the AI route
handlers use to produce the ``(system, user, assembly_id)`` triple from
a prompt name + variables dict.
"""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.prompts import PROMPTS, Prompt
from app.ai.prompts import render as render_builtin
from app.models.ai_prompt_template_binding import AIPromptTemplateBinding
from app.models.prompt_assembly import PromptAssembly
from app.services.prompt_assembly import render_assembly

# ============================================================================
# CRUD
# ============================================================================

def list_bindings(db: Session) -> dict[str, int | None]:
    """Return ``{prompt_name: assembly_id | None}`` for every binding row."""
    rows = db.scalars(select(AIPromptTemplateBinding)).all()
    return {r.prompt_name: r.assembly_id for r in rows}


def get_binding(
    db: Session, prompt_name: str
) -> AIPromptTemplateBinding | None:
    return db.get(AIPromptTemplateBinding, prompt_name)


def set_binding(
    db: Session,
    prompt_name: str,
    assembly_id: int | None,
) -> AIPromptTemplateBinding:
    """Upsert the binding for ``prompt_name``.

    Setting ``assembly_id=None`` removes the override and reverts the call
    to the built-in template.
    """
    if prompt_name not in PROMPTS:
        raise UnknownPromptError(prompt_name)
    if assembly_id is not None and db.get(PromptAssembly, assembly_id) is None:
        raise UnknownAssemblyError(assembly_id)
    row = db.get(AIPromptTemplateBinding, prompt_name)
    if row is None:
        row = AIPromptTemplateBinding(
            prompt_name=prompt_name, assembly_id=assembly_id
        )
        db.add(row)
    else:
        row.assembly_id = assembly_id
    db.commit()
    db.refresh(row)
    return row


def clear_binding(db: Session, prompt_name: str) -> bool:
    row = db.get(AIPromptTemplateBinding, prompt_name)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


# ============================================================================
# Clone a built-in prompt to a new assembly
# ============================================================================

def clone_builtin_to_assembly(
    db: Session,
    prompt_name: str,
    *,
    name: str,
    description: str | None = None,
) -> PromptAssembly:
    """Create a new :class:`PromptAssembly` seeded from the built-in body.

    The new assembly is a single ``text`` part on each side so the user
    can freely edit the prompt — variables ``{var}`` are preserved
    verbatim.
    """
    if prompt_name not in PROMPTS:
        raise UnknownPromptError(prompt_name)
    p: Prompt = PROMPTS[prompt_name]
    system_parts = [{"type": "text", "body": p.system}]
    user_parts = [{"type": "text", "body": p.user_template}]
    assembly = PromptAssembly(
        name=name,
        description=description,
        system_parts_json=json.dumps(system_parts, ensure_ascii=False),
        user_parts_json=json.dumps(user_parts, ensure_ascii=False),
        sample_vars_json="{}",
    )
    db.add(assembly)
    db.commit()
    db.refresh(assembly)
    return assembly


# ============================================================================
# Domain exceptions
# ============================================================================

class UnknownPromptError(KeyError):
    """A prompt name isn't registered in ``app.ai.prompts.PROMPTS``."""

    def __init__(self, prompt_name: str):
        super().__init__(prompt_name)
        self.prompt_name = prompt_name

    def __str__(self) -> str:  # KeyError uses args[0] in repr; override for cleaner logs
        return f"Unknown prompt: {self.prompt_name}"


class UnknownAssemblyError(ValueError):
    """An assembly_id was supplied that doesn't exist."""

    def __init__(self, assembly_id: int):
        super().__init__(assembly_id)
        self.assembly_id = assembly_id

    def __str__(self) -> str:
        return f"Unknown assembly: {self.assembly_id}"


# ============================================================================
# Resolve at request time
# ============================================================================

class ResolvedPrompt:
    """Result of :func:`resolve_prompt`."""

    __slots__ = ("system", "user", "assembly_id", "builtin_name")

    def __init__(
        self,
        *,
        system: str,
        user: str,
        assembly_id: int | None,
        builtin_name: str,
    ):
        self.system = system
        self.user = user
        self.assembly_id = assembly_id  # None → used the built-in
        self.builtin_name = builtin_name  # always the registered prompt name


def resolve_prompt(
    db: Session,
    prompt_name: str,
    variables: dict[str, Any],
) -> ResolvedPrompt:
    """Return the rendered ``(system, user)`` for ``prompt_name``.

    Resolution order:

    1. If a binding exists and references an existing assembly, render via
       :func:`render_assembly` (this allows user-defined fragments and
       variable interpolation).
    2. Otherwise, render the built-in template registered in
       ``app.ai.prompts.PROMPTS``.

    Any :class:`AssemblyRenderError` is re-raised so the caller can
    surface it as a 422.
    """
    p: Prompt = PROMPTS[prompt_name]
    binding = db.get(AIPromptTemplateBinding, prompt_name)
    if binding is not None and binding.assembly_id is not None:
        assembly = db.get(PromptAssembly, binding.assembly_id)
        if assembly is not None:
            rendered = render_assembly(db, assembly, variables)
            return ResolvedPrompt(
                system=rendered.system,
                user=rendered.user,
                assembly_id=assembly.id,
                builtin_name=prompt_name,
            )
    system, user = render_builtin(p, variables)
    return ResolvedPrompt(
        system=system, user=user, assembly_id=None, builtin_name=prompt_name
    )
