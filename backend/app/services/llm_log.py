"""Service for the LLM request/response audit log.

Every AI call routed through ``app/api/v1/ai.py::_call`` (or
``free_chat``) calls ``record()`` once the underlying ``chat()`` returns —
either success, ``AIServiceError`` (not configured / generic), or JSON
parse failure.

To prevent unbounded growth, ``record()`` enforces a rolling cap: when
the table exceeds ``MAX_LOGS`` rows, the oldest rows are deleted in a
single statement after the insert.
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.llm_request_log import LlmRequestLog


MAX_LOGS = 1000
PREVIEW_LEN = 200


def _preview(text: Optional[str]) -> str:
    if not text:
        return ""
    if len(text) <= PREVIEW_LEN:
        return text
    return text[:PREVIEW_LEN] + "…"


def record(
    db: Session,
    *,
    prompt_name: str,
    endpoint: str,
    system: str,
    user: str,
    status: str,
    response: Optional[str] = None,
    error: Optional[str] = None,
    duration_ms: int = 0,
    work_id: Optional[int] = None,
    model: Optional[str] = None,
    profile_id: Optional[int] = None,
    provider: Optional[str] = None,
) -> LlmRequestLog:
    """Insert a new log row, then trim the oldest if over ``MAX_LOGS``."""
    row = LlmRequestLog(
        prompt_name=prompt_name,
        endpoint=endpoint,
        system=system,
        user=user,
        status=status,
        response=response,
        error=error,
        duration_ms=duration_ms,
        work_id=work_id,
        model=model,
        profile_id=profile_id,
        provider=provider,
    )
    db.add(row)
    db.flush()  # populate row.id + created_at

    total = db.scalar(select(func.count(LlmRequestLog.id))) or 0
    if total > MAX_LOGS:
        # delete oldest excess rows (one shot, no per-row loop)
        excess = total - MAX_LOGS
        # subquery of the `excess` oldest ids
        oldest_ids = db.scalars(
            select(LlmRequestLog.id)
            .order_by(LlmRequestLog.created_at.asc(), LlmRequestLog.id.asc())
            .limit(excess)
        ).all()
        if oldest_ids:
            db.execute(
                delete(LlmRequestLog).where(LlmRequestLog.id.in_(oldest_ids))
            )

    db.commit()
    db.refresh(row)
    return row


def to_summary(row: LlmRequestLog) -> dict:
    """Convert an ORM row into a Summary-shaped dict (with previews)."""
    return {
        "id": row.id,
        "prompt_name": row.prompt_name,
        "endpoint": row.endpoint,
        "work_id": row.work_id,
        "status": row.status,
        "duration_ms": row.duration_ms,
        "model": row.model,
        "provider": row.provider,
        "profile_id": row.profile_id,
        "user_preview": _preview(row.user),
        "response_preview": _preview(row.response),
        "error": row.error,
        "created_at": row.created_at,
    }


def list_logs(
    db: Session,
    *,
    work_id: Optional[int] = None,
    prompt_name: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[LlmRequestLog], int]:
    """Paginated listing. Returns (rows, total)."""
    base = select(LlmRequestLog)
    if work_id is not None:
        base = base.where(LlmRequestLog.work_id == work_id)
    if prompt_name is not None:
        base = base.where(LlmRequestLog.prompt_name == prompt_name)
    if status is not None:
        base = base.where(LlmRequestLog.status == status)

    total = db.scalar(
        select(func.count()).select_from(base.subquery())
    ) or 0

    rows = db.scalars(
        base.order_by(LlmRequestLog.created_at.desc(), LlmRequestLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return list(rows), int(total)


def get_log(db: Session, log_id: int) -> Optional[LlmRequestLog]:
    return db.get(LlmRequestLog, log_id)


def delete_log(db: Session, log_id: int) -> bool:
    row = db.get(LlmRequestLog, log_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def clear_logs(
    db: Session,
    *,
    work_id: Optional[int] = None,
    prompt_name: Optional[str] = None,
) -> int:
    """Bulk delete. Returns rows deleted."""
    stmt = delete(LlmRequestLog)
    if work_id is not None:
        stmt = stmt.where(LlmRequestLog.work_id == work_id)
    if prompt_name is not None:
        stmt = stmt.where(LlmRequestLog.prompt_name == prompt_name)
    result = db.execute(stmt)
    db.commit()
    return int(result.rowcount or 0)
