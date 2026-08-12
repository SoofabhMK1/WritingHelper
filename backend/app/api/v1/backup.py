"""Database backup / restore.

Single-user local DB — these endpoints expose the SQLite file for download
and accept a SQLite file for restore. Restore is destructive (overwrites
the current DB after backing it up to a timestamped file).
"""
from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine, get_db

router = APIRouter(prefix="/backup", tags=["backup"])


def _resolve_db_path() -> Path:
    """Resolve the SQLite file path from alembic_database_url.

    Only SQLite is supported. Handles both `sqlite:///relative/path` and
    `sqlite:////abs/path` (4 slashes for absolute).

    Re-reads the env var each call so tests using ALEMBIC_DATABASE_URL=...
    are picked up.
    """
    import os

    url = os.environ.get(
        "ALEMBIC_DATABASE_URL",
        settings.alembic_database_url,
    )
    parsed = urlparse(url)
    if not parsed.scheme.startswith("sqlite"):
        raise HTTPException(
            status_code=501, detail="Backup only supported for SQLite databases"
        )
    # urlparse on Windows may put the drive letter into netloc for absolute paths.
    # Reconstruct the path: prefer netloc + path if netloc looks like a drive letter.
    raw = parsed.netloc + parsed.path
    if not raw:
        raise HTTPException(status_code=500, detail="Cannot parse DB URL")
    # Strip a single leading slash if it makes the path look absolute (Windows).
    # e.g. '/./data/novel.db' should resolve to './data/novel.db' (relative to cwd),
    # and '/C:/path/...' should resolve to 'C:/path/...' (absolute).
    if raw.startswith("/./") or (len(raw) >= 3 and raw[0] == "/" and raw[2] == ":"):
        raw = raw[1:]
    p = Path(raw)
    if not p.is_absolute():
        p = (Path.cwd() / p).resolve()
    return p


def _checkpoint(db: Session) -> None:
    """Try to flush WAL data into the main file."""
    try:
        db.execute(text("PRAGMA wal_checkpoint(TRUNCATE)"))
        db.commit()
    except Exception:
        db.rollback()


@router.get("/download")
def download_backup(db: Session = Depends(get_db)):
    """Stream the current SQLite database file."""
    path = _resolve_db_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="Database file not found")
    _checkpoint(db)
    return FileResponse(
        path=str(path),
        media_type="application/octet-stream",
        filename=f"xiaoshuo-backup-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.db",
    )


@router.post("/restore")
async def restore_backup(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Replace the current database with the uploaded SQLite file.

    The current DB is first copied to a timestamped backup. The uploaded
    file is validated by attempting to open it as a SQLite DB before swap.
    """
    if file.content_type and file.content_type not in (
        "application/octet-stream",
        "application/x-sqlite3",
        "application/sql",
    ):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    current_path = _resolve_db_path()
    if not current_path.exists():
        raise HTTPException(status_code=404, detail="Current database not found")

    tmp_path = current_path.with_suffix(".uploaded.db")
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # validate by attempting to open
    try:
        import sqlite3

        conn = sqlite3.connect(str(tmp_path))
        try:
            cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1")
            if cur.fetchone() is None:
                raise ValueError("Uploaded file contains no tables")
        finally:
            conn.close()
    except Exception as e:
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Invalid SQLite file: {e}") from e

    # close current session/engine to release file lock
    _checkpoint(db)
    engine.dispose()

    # backup current file
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    backup_path = current_path.with_suffix(f".backup-{timestamp}.db")
    shutil.copy2(current_path, backup_path)

    # swap
    shutil.move(str(tmp_path), str(current_path))

    return {
        "ok": True,
        "backup_file": str(backup_path),
        "restored_to": str(current_path),
    }


@router.get("/info")
def backup_info(db: Session = Depends(get_db)):
    path = _resolve_db_path()
    if not path.exists():
        return {"exists": False, "path": str(path)}
    stat = path.stat()
    _checkpoint(db)
    return {
        "exists": True,
        "path": str(path),
        "size_bytes": stat.st_size,
        "size_human": _human_size(stat.st_size),
        "mtime": datetime.fromtimestamp(stat.st_mtime).isoformat(),
    }


def _human_size(n: int) -> str:
    units = ["B", "KB", "MB", "GB"]
    i = 0
    while n >= 1024 and i < len(units) - 1:
        n /= 1024
        i += 1
    return f"{n:.1f} {units[i]}"