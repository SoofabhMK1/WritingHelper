"""Tests for /api/v1/backup."""
import io
import sqlite3

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
    assert r.content[:15] == b"SQLite format 3"


def test_restore_invalid_file(client):
    fake = io.BytesIO(b"not a sqlite file at all")
    r = client.post(
        "/api/v1/backup/restore",
        files={"file": ("bad.db", fake, "application/octet-stream")},
    )
    assert r.status_code == 400
    assert "Invalid SQLite" in r.json()["detail"]


def test_restore_foreign_sqlite_rejected(client, tmp_path):
    """A valid SQLite file but missing our app schema is rejected (B4)."""
    tmp = tmp_path / "foreign.db"
    conn = sqlite3.connect(str(tmp))
    conn.execute("CREATE TABLE dummy(x INTEGER);")
    conn.close()

    bio = io.BytesIO(tmp.read_bytes())
    bio.seek(0)

    r = client.post(
        "/api/v1/backup/restore",
        files={"file": ("foreign.db", bio, "application/octet-stream")},
    )
    assert r.status_code == 400
    assert "schema incomplete" in r.json()["detail"]


def test_restore_keeps_subsequent_requests_alive(client, tmp_path):
    """After restore, the next request still succeeds (B5)."""
    # Build a "backup" by cloning the current test DB (conftest populates
    # all required tables including alembic_version).
    import shutil as _sh

    from tests.conftest import DB_FILE

    clone = tmp_path / "valid.db"
    _sh.copy2(DB_FILE, clone)

    bio = io.BytesIO(clone.read_bytes())
    bio.seek(0)

    r = client.post(
        "/api/v1/backup/restore",
        files={"file": ("valid.db", bio, "application/octet-stream")},
    )
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True
    assert r.json()["restart_recommended"] is False

    # Subsequent request must still work — engine.dispose() shouldn't have
    # left the app in a broken state.
    r2 = client.get("/api/v1/works")
    assert r2.status_code == 200
    assert r2.json() == []


def test_restore_wrong_content_type(client):
    fake = io.BytesIO(b"x")
    r = client.post(
        "/api/v1/backup/restore",
        files={"file": ("x.db", fake, "text/plain")},
    )
    assert r.status_code == 400