from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.prompt_fragment import (
    PromptFragmentCreate,
    PromptFragmentOut,
    PromptFragmentUpdate,
)
from app.services import prompt_fragment as fragment_service

router = APIRouter(prefix="/prompt-fragments", tags=["prompt-fragments"])


@router.get("", response_model=List[PromptFragmentOut])
def list_fragments(
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return fragment_service.list_fragments(db, q=q)


@router.post(
    "",
    response_model=PromptFragmentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_fragment(payload: PromptFragmentCreate, db: Session = Depends(get_db)):
    return fragment_service.create_fragment(db, payload)


@router.get("/{fragment_id}", response_model=PromptFragmentOut)
def get_fragment(fragment_id: int, db: Session = Depends(get_db)):
    row = fragment_service.get_fragment(db, fragment_id)
    if row is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Prompt fragment not found")
    return row


@router.put("/{fragment_id}", response_model=PromptFragmentOut)
def update_fragment(
    fragment_id: int,
    payload: PromptFragmentUpdate,
    db: Session = Depends(get_db),
):
    row = fragment_service.update_fragment(db, fragment_id, payload)
    if row is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Prompt fragment not found")
    return row


@router.delete("/{fragment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fragment(fragment_id: int, db: Session = Depends(get_db)):
    ok = fragment_service.delete_fragment(db, fragment_id)
    if not ok:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Prompt fragment not found")
    return None