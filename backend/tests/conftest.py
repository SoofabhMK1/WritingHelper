"""Pytest fixtures: per-test temporary SQLite + FastAPI TestClient.

Strategy:
- Override the engine to point at a fresh sqlite file in a tmp dir.
- Override the `get_db` dependency to use a session bound to that engine.
- Create tables directly via Base.metadata (skip alembic for unit tests).
"""
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# set env BEFORE importing app modules
TMP_DIR = Path(__file__).resolve().parent / "_tmp"
TMP_DIR.mkdir(parents=True, exist_ok=True)
DB_FILE = TMP_DIR / "test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{DB_FILE.as_posix()}"
os.environ["ALEMBIC_DATABASE_URL"] = f"sqlite:///{DB_FILE.as_posix()}"

# bust settings cache so the new env is picked up
import app.config  # noqa: E402
app.config.get_settings.cache_clear()

from app.database import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.base import Base  # noqa: E402

engine = create_engine(
    f"sqlite:///{DB_FILE.as_posix()}",
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _enable_sqlite_fk(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    # mirror alembic's bookkeeping table so backup-restore schema validation
    # sees the same surface as a production DB.
    with engine.begin() as conn:
        conn.exec_driver_sql(
            "CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)"
        )
        conn.exec_driver_sql(
            "INSERT OR REPLACE INTO alembic_version VALUES ('0014_drop_event_link_created_at')"
        )
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()