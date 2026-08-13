
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.prompt_assembly import (
    AssemblyRenderRequest,
    AssemblyRenderResult,
    PromptAssemblyCreate,
    PromptAssemblyOut,
    PromptAssemblyUpdate,
)
from app.services import prompt_assembly as assembly_service

router = APIRouter(prefix="/prompt-assemblies", tags=["prompt-assemblies"])


@router.get("", response_model=list[PromptAssemblyOut])
def list_assemblies(
    q: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return assembly_service.list_assemblies(db, q=q)


@router.post(
    "",
    response_model=PromptAssemblyOut,
    status_code=status.HTTP_201_CREATED,
)
def create_assembly(
    payload: PromptAssemblyCreate,
    db: Session = Depends(get_db),
):
    return assembly_service.create_assembly(db, payload)


@router.get("/{assembly_id}", response_model=PromptAssemblyOut)
def get_assembly(assembly_id: int, db: Session = Depends(get_db)):
    row = assembly_service.get_assembly(db, assembly_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Prompt assembly not found")
    return row


@router.put("/{assembly_id}", response_model=PromptAssemblyOut)
def update_assembly(
    assembly_id: int,
    payload: PromptAssemblyUpdate,
    db: Session = Depends(get_db),
):
    row = assembly_service.update_assembly(db, assembly_id, payload)
    if row is None:
        raise HTTPException(status_code=404, detail="Prompt assembly not found")
    return row


@router.delete("/{assembly_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assembly(assembly_id: int, db: Session = Depends(get_db)):
    ok = assembly_service.delete_assembly(db, assembly_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Prompt assembly not found")
    return None


@router.post("/{assembly_id}/render", response_model=AssemblyRenderResult)
def render_assembly(
    assembly_id: int,
    payload: AssemblyRenderRequest,
    db: Session = Depends(get_db),
):
    row = assembly_service.get_assembly(db, assembly_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Prompt assembly not found")
    try:
        return assembly_service.render_assembly(db, row, payload.variables)
    except assembly_service.AssemblyRenderError as e:
        raise HTTPException(
            status_code=422, detail={"code": e.code, "message": str(e)}
        ) from e