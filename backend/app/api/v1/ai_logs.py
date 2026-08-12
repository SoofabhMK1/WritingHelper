"""Audit log routes: list / detail / delete LLM request logs.

The log table is global (not scoped under a work) — the chat endpoint
can run without a work_id, and audit data should survive work deletion
via ``ON DELETE SET NULL``. The list endpoint accepts an optional
``work_id`` filter to scope the view.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.llm_log import LlmRequestLogDetail, LlmRequestLogList
from app.services import llm_log as service

router = APIRouter(prefix="/ai-logs", tags=["ai-logs"])


@router.get("", response_model=LlmRequestLogList)
def list_logs(
    work_id: Optional[int] = Query(None, ge=1),
    prompt_name: Optional[str] = Query(None, max_length=40),
    log_status: Optional[str] = Query(None, alias="status", max_length=20),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
):
    rows, total = service.list_logs(
        db,
        work_id=work_id,
        prompt_name=prompt_name,
        status=log_status,
        page=page,
        page_size=page_size,
    )
    return LlmRequestLogList(
        items=[service.to_summary(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{log_id}", response_model=LlmRequestLogDetail)
def get_log(log_id: int, db: Session = Depends(get_db)):
    row = service.get_log(db, log_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Log not found")
    return row


@router.delete("", status_code=status.HTTP_200_OK)
def clear_logs(
    work_id: Optional[int] = Query(None, ge=1),
    prompt_name: Optional[str] = Query(None, max_length=40),
    db: Session = Depends(get_db),
):
    deleted = service.clear_logs(
        db,
        work_id=work_id,
        prompt_name=prompt_name,
    )
    return {"deleted": deleted}


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(log_id: int, db: Session = Depends(get_db)):
    ok = service.delete_log(db, log_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Log not found")
    return None
