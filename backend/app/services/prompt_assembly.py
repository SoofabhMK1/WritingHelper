"""CRUD + rendering for PromptAssembly.

The core function is `render_assembly(assembly, variables)` which walks the
two part lists (system / user) and produces a `(system_str, user_str)` tuple.
"""
from __future__ import annotations

import json
from typing import Any

from pydantic import TypeAdapter
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.prompts import PROMPTS
from app.models.prompt_assembly import PromptAssembly
from app.schemas.prompt_assembly import (
    AssemblyRenderResult,
    Part,
    PromptAssemblyCreate,
    PromptAssemblyUpdate,
)
from app.services import prompt_fragment as fragment_service

_part_adapter: TypeAdapter[list[Part]] = TypeAdapter(list[Part])
_sample_adapter: TypeAdapter[dict[str, Any]] = TypeAdapter(dict[str, Any])

# Separator between rendered parts — markdown paragraph break.
_SEPARATOR = "\n\n"


class _SoftVars(dict):
    """Mapping that substitutes missing keys and `None` values with empty string.

    Used with `str.format_map` so that variable interpolation in fragments,
    text, and builtin slots never raises on missing keys.
    """

    def __missing__(self, key: str) -> str:
        return ""

    def __getitem__(self, key: str) -> str:
        val = super().get(key, "")
        return "" if val is None else val

    def get(self, key: str, default: Any = "") -> str:
        val = super().get(key, default)
        return "" if val is None else val


def _soft_format(text: str, variables: dict[str, Any]) -> str:
    return text.format_map(_SoftVars(variables))


# ============================================================================
# JSON <-> typed-list helpers
# ============================================================================

def _encode_parts(parts: list[Any] | None) -> str:
    """Serialize a list of Part dataclass instances or plain dicts.

    Accepts dicts so callers coming from `model_dump(exclude_unset=True)`
    (which produces dicts) don't have to reconstruct Pydantic models.
    """
    if parts is None:
        return "[]"
    out = []
    for p in parts:
        if hasattr(p, "model_dump"):
            out.append(p.model_dump())
        else:
            out.append(p)
    return json.dumps(out, ensure_ascii=False)


def _decode_parts(raw: str) -> list[Part]:
    if not raw:
        return []
    return _part_adapter.validate_json(raw)


def _encode_sample(sample: dict[str, Any] | None) -> str:
    if sample is None:
        return "{}"
    return json.dumps(sample, ensure_ascii=False)


def _decode_sample(raw: str) -> dict[str, Any]:
    if not raw:
        return {}
    return _sample_adapter.validate_json(raw)


# ============================================================================
# CRUD
# ============================================================================

def list_assemblies(
    db: Session, q: str | None = None
) -> list[PromptAssembly]:
    stmt = select(PromptAssembly)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(PromptAssembly.name.ilike(like))
    stmt = stmt.order_by(PromptAssembly.id)
    return list(db.scalars(stmt).all())


def get_assembly(
    db: Session, assembly_id: int
) -> PromptAssembly | None:
    return db.get(PromptAssembly, assembly_id)


def create_assembly(
    db: Session, payload: PromptAssemblyCreate
) -> PromptAssembly:
    row = PromptAssembly(
        name=payload.name,
        description=payload.description,
        system_parts_json=_encode_parts(payload.system_parts),
        user_parts_json=_encode_parts(payload.user_parts),
        sample_vars_json=_encode_sample(payload.sample_vars),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_assembly(
    db: Session, assembly_id: int, payload: PromptAssemblyUpdate
) -> PromptAssembly | None:
    row = db.get(PromptAssembly, assembly_id)
    if row is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        row.name = data["name"]
    if "description" in data:
        row.description = data["description"]
    if "system_parts" in data:
        row.system_parts_json = _encode_parts(data["system_parts"])
    if "user_parts" in data:
        row.user_parts_json = _encode_parts(data["user_parts"])
    if "sample_vars" in data:
        row.sample_vars_json = _encode_sample(data["sample_vars"])
    db.commit()
    db.refresh(row)
    return row


def delete_assembly(db: Session, assembly_id: int) -> bool:
    row = db.get(PromptAssembly, assembly_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


# ============================================================================
# Rendering
# ============================================================================

class AssemblyRenderError(ValueError):
    """Raised when an assembly cannot be rendered (missing ref, etc.)."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def _render_part_list(
    parts: list[Part],
    fragments_map: dict[int, Any],
    variables: dict[str, Any],
) -> str:
    """Walk a part list, return the joined string.

    All parts whose payload is a string (text, fragment, builtin) have
    `{variable}` placeholders substituted with `variables`; missing keys
    and `None` values resolve to empty string.
    """
    chunks: list[str] = []
    for idx, part in enumerate(parts):
        # The discriminated union type is erased at runtime — branch on `type`.
        if part.type == "fragment":
            row = fragments_map.get(part.fragment_id)
            if row is None:
                raise AssemblyRenderError(
                    code="missing_fragment",
                    message=(
                        f"Part #{idx} references missing fragment "
                        f"id={part.fragment_id}"
                    ),
                )
            chunks.append(_soft_format(row.body, variables))
        elif part.type == "builtin":
            prompt = PROMPTS.get(part.prompt_name)
            if prompt is None:
                raise AssemblyRenderError(
                    code="missing_builtin",
                    message=(
                        f"Part #{idx} references unknown prompt "
                        f"'{part.prompt_name}'"
                    ),
                )
            slot = (
                prompt.user_template
                if part.slot == "user_template"
                else prompt.system
            )
            chunks.append(_soft_format(slot, variables))
        elif part.type == "text":
            chunks.append(_soft_format(part.body, variables))
        elif part.type == "variable":
            chunks.append(_SoftVars(variables).get(part.name, ""))
        else:  # pragma: no cover — discriminated union keeps this unreachable
            raise AssemblyRenderError(
                code="unknown_part",
                message=f"Part #{idx} has unknown type",
            )
    return _SEPARATOR.join(chunks)


def render_assembly(
    db: Session,
    assembly: PromptAssembly,
    variables: dict[str, Any] | None = None,
) -> AssemblyRenderResult:
    """Render an assembly to (system, user) using the supplied variables.

    Looks up all fragments referenced by the assembly in a single batch query.
    """
    variables = variables or {}

    system_parts = _decode_parts(assembly.system_parts_json)
    user_parts = _decode_parts(assembly.user_parts_json)

    fragment_ids: set[int] = set()
    for p in system_parts + user_parts:
        if p.type == "fragment":
            fragment_ids.add(p.fragment_id)
    fragments_map = fragment_service.get_fragments_by_ids(
        db, sorted(fragment_ids)
    )

    system_str = _render_part_list(system_parts, fragments_map, variables)
    user_str = _render_part_list(user_parts, fragments_map, variables)
    return AssemblyRenderResult(system=system_str, user=user_str)