"""Routes for AI prompt → prompt_assembly bindings + clone-from-builtin.

These are *configuration* endpoints — they don't trigger any LLM call.
They live under the existing ``/api/v1/ai`` prefix to keep all
AI-related routes in one namespace.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai import prompts as ai_prompts
from app.database import get_db
from app.schemas.ai_prompt_template import (
    AIClonePromptRequest,
    AIBuiltInPromptDetail,
    AIBuiltInPromptSummary,
    AIPromptTemplateBindingOut,
    AIPromptTemplateBindingsOut,
    AIPromptTemplateBindingUpdate,
)
from app.schemas.prompt_assembly import PromptAssemblyOut
from app.services import ai_prompt_template as svc


router = APIRouter(prefix="/ai", tags=["ai"])


# -----------------------------------------------------------------------------
# Built-in catalog (read-only — re-exposed here so the prompt management
# page doesn't have to depend on /prompts/{name} route differences).
# -----------------------------------------------------------------------------


@router.get("/prompts-catalog", response_model=list[AIBuiltInPromptSummary])
def list_builtin_catalog():
    """Lightweight list of built-in prompts (name/json_mode/temperature)."""
    return [
        AIBuiltInPromptSummary(
            name=p.name, json_mode=p.json_mode, temperature=p.temperature
        )
        for p in ai_prompts.list_prompts()
    ]


@router.get(
    "/prompts-catalog/{name}",
    response_model=AIBuiltInPromptDetail,
)
def get_builtin_catalog(name: str):
    p = ai_prompts.get_prompt(name)
    if p is None:
        raise HTTPException(status_code=404, detail=f"Unknown prompt: {name}")
    return AIBuiltInPromptDetail(
        name=p.name,
        system=p.system,
        user_template=p.user_template,
        json_mode=p.json_mode,
        temperature=p.temperature,
    )


# -----------------------------------------------------------------------------
# Bindings
# -----------------------------------------------------------------------------


@router.get(
    "/prompt-template-bindings",
    response_model=AIPromptTemplateBindingsOut,
)
def list_template_bindings(db: Session = Depends(get_db)):
    return AIPromptTemplateBindingsOut(bindings=svc.list_bindings(db))


@router.get(
    "/prompt-template-bindings/{prompt_name}",
    response_model=AIPromptTemplateBindingOut,
)
def get_template_binding(prompt_name: str, db: Session = Depends(get_db)):
    row = svc.get_binding(db, prompt_name)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No template binding for prompt '{prompt_name}' "
                "(using built-in)"
            ),
        )
    return row


@router.put(
    "/prompt-template-bindings/{prompt_name}",
    response_model=AIPromptTemplateBindingOut,
)
def put_template_binding(
    prompt_name: str,
    payload: AIPromptTemplateBindingUpdate,
    db: Session = Depends(get_db),
):
    return svc.set_binding(db, prompt_name, payload.assembly_id)


@router.delete(
    "/prompt-template-bindings/{prompt_name}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_template_binding(prompt_name: str, db: Session = Depends(get_db)):
    if not svc.clear_binding(db, prompt_name):
        raise HTTPException(
            status_code=404,
            detail=f"No template binding for prompt '{prompt_name}'",
        )
    return None


# -----------------------------------------------------------------------------
# Clone built-in → new assembly
# -----------------------------------------------------------------------------


@router.post(
    "/prompts/{prompt_name}/clone",
    response_model=PromptAssemblyOut,
    status_code=status.HTTP_201_CREATED,
)
def clone_builtin_prompt(
    prompt_name: str,
    payload: AIClonePromptRequest,
    db: Session = Depends(get_db),
):
    assembly = svc.clone_builtin_to_assembly(
        db,
        prompt_name,
        name=payload.name,
        description=payload.description,
    )
    return PromptAssemblyOut.model_validate(assembly)
