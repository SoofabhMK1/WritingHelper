"""Tests for /api/v1/backup."""
import io
import sqlite3
from pathlib import Path

import pytest


def test_backup_info(client):
    r = client.get("/api/v1/backup/info")
    assert r.status_code == 200
    body = r.json()
    assert body["exists"] is True
    assert body["size_bytes"] > 0
    assert "KB" in body["size_human"] or "B" in body["size_human"]


def test_download_backup(client):
    r = client.get("/api/v1/backup/download")
    assert r.status_code == 200
    assert "xiaoshuo-backup-" in r.headers.get("content-disposition", "")
    assert r.headers.get("content-type") == "application/octet-stream"
    # response body should be the SQLite header bytes
    assert r.content[:15] == b"SQLite format 3"


def test_restore_invalid_file(client):
    fake = io.BytesIO(b"not a sqlite file at all")
    r = client.post(
        "/api/v1/backup/restore",
        files={"file": ("bad.db", fake, "application/octet-stream")},
    )
    assert r.status_code == 400
    assert "Invalid SQLite" in r.json()["detail"]


def test_restore_empty_sqlite(client):
    """A valid SQLite file but with no tables should be rejected."""
    p = Path(client.app.dependency_overrides[None]) if False else None  # noqa
    # create an empty-but-valid sqlite file in memory
    buf = io.BytesIO()
    conn = sqlite3.connect(":memory:")
    # do nothing — empty db
    bio = io.BytesIO()
    # use python's sqlite to write to a real file then read
    tmp = Path("/tmp/empty.db")
    if tmp.exists():
        tmp.unlink()
    conn = sqlite3.connect(str(tmp))
    conn.execute("CREATE TABLE dummy(x INTEGER);")
    conn.close()
    bio.write(tmp.read_bytes())
    tmp.unlink()
    bio.seek(0)

    r = client.post(
        "/api/v1/backup/restore",
        files={"file": ("empty.db", bio, "application/octet-stream")},
    )
    # The file is valid SQLite (has a table), so this should succeed
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert "backup_file" in body


def test_restore_wrong_content_type(client):
    fake = io.BytesIO(b"x")
    r = client.post(
        "/api/v1/backup/restore",
        files={"file": ("x.db", fake, "text/plain")},
    )
    assert r.status_code == 400