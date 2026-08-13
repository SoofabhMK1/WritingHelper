"""End-to-end cascade test: deleting a Work should clean up every
work-scoped resource while preserving global audit history.

Asserts the cascade surface declared in `AGENTS.md` — if a new
work-scoped table is added without `ON DELETE CASCADE`, this test should
start failing and prompt the author to wire the FK.
"""
from __future__ import annotations

from unittest.mock import patch

from sqlalchemy import text
from sqlalchemy.orm import Session


def _make_full_work(client) -> tuple[int, dict[str, int]]:
    """Create one work with one of every work-scoped child, returning
    the work_id plus an ``ids`` dict keyed by table name."""
    wid = client.post("/api/v1/works", json={"title": "全量测试作品"}).json()["id"]
    ids: dict[str, int] = {}

    vid = client.post(
        f"/api/v1/works/{wid}/volumes",
        json={"title": "第一卷", "order_num": 0, "status": "planning", "target_words": 1000},
    ).json()["id"]
    ids["volumes"] = vid

    cid = client.post(
        f"/api/v1/works/{wid}/chapters",
        json={
            "work_id": wid,
            "volume_id": vid,
            "title": "第一章",
            "content": "他提起剑。",
            "order_num": 0,
            "target_words": 3000,
            "actual_words": 5,
            "status": "draft",
            "chapter_type": "plot",
        },
    ).json()["id"]
    ids["chapters"] = cid

    char_id = client.post(
        f"/api/v1/works/{wid}/characters",
        json={"name": "主角", "role": "protagonist"},
    ).json()["id"]
    ids["characters"] = char_id

    proto_resp = client.post(
        f"/api/v1/works/{wid}/protagonists",
        json={"character_id": char_id, "core_conflict": "内心冲突"},
    )
    if proto_resp.status_code == 201:
        ids["protagonist_profiles"] = proto_resp.json()["id"]
    else:
        # Conflict from a prior attempt in the same test session — fetch existing.
        # (defensive: shouldn't happen because tests run in isolation.)
        ids["protagonist_profiles"] = client.get(
            f"/api/v1/works/{wid}/protagonists"
        ).json()[0]["id"]

    ev_id = client.post(
        f"/api/v1/works/{wid}/events",
        json={"title": "事件一", "chapter_id": cid, "event_type": "main", "importance": 5, "status": "active"},
    ).json()["id"]
    ids["events"] = ev_id

    client.post(
        f"/api/v1/works/{wid}/events/{ev_id}/characters",
        json={"character_id": char_id, "role": "initiator"},
    )

    state_id = client.post(
        f"/api/v1/works/{wid}/states",
        json={
            "character_id": char_id,
            "chapter_id": cid,
            "state_type": "trait",
            "state_key": "courage",
            "state_value": "high",
        },
    ).json()["id"]
    ids["character_states"] = state_id

    fs_id = client.post(
        f"/api/v1/works/{wid}/foreshadowing",
        json={
            "title": "伏笔",
            "quote": "一段原文",
            "chapter_id": cid,
            "planted_chapter_id": cid,
            "status": "open",
        },
    ).json()["id"]
    ids["foreshadowing"] = fs_id

    # Add a second event so we can create an event link.
    ev2_id = client.post(
        f"/api/v1/works/{wid}/events",
        json={"title": "事件二", "event_type": "branch", "importance": 3, "status": "planned"},
    ).json()["id"]
    client.post(
        f"/api/v1/works/{wid}/events/{ev_id}/links",
        json={"source_event_id": ev_id, "target_event_id": ev2_id, "link_type": "causes"},
    )

    # Trigger one AI call so an LLM log row exists for this work.
    p_id = client.post(
        "/api/v1/ai/profiles",
        json={
            "name": "cascade-profile",
            "provider": "openai",
            "base_url": "https://api.openai.com/v1",
            "model": "x",
            "api_key": "k",
            "is_default": True,
        },
    ).json()["id"]
    with patch("app.ai.client.chat", return_value="hi"):
        client.post(
            "/api/v1/ai/chat",
            json={"work_id": wid, "question": "ping"},
        )

    return wid, ids


class TestWorkDeletionCascade:
    """Deleting a Work must wipe every work-scoped row but keep the
    global LLM audit log."""

    def test_delete_work_wipes_every_scoped_child(
        self, client, db_session: Session
    ):
        from tests.conftest import engine
        from app.models.base import Base  # noqa: F401

        # Tables with a direct work_id column.
        direct_tables = [
            "foreshadowing",
            "character_states",
            "events",
            "protagonist_profiles",
            "characters",
            "chapters",
            "volumes",
            "event_links",  # has work_id (denormalized)
        ]

        wid, ids = _make_full_work(client)
        with engine.connect() as conn:
            for tbl in direct_tables:
                n = conn.execute(
                    text(f"SELECT COUNT(*) FROM {tbl} WHERE work_id = :w"),
                    {"w": wid},
                ).scalar()
                assert n >= 1, f"{tbl} should have ≥1 row before delete"
            # event_characters joins via events (no direct work_id column)
            n = conn.execute(
                text(
                    "SELECT COUNT(*) FROM event_characters ec "
                    "JOIN events e ON ec.event_id = e.id "
                    "WHERE e.work_id = :w"
                ),
                {"w": wid},
            ).scalar()
            assert n >= 1, "event_characters (via events) should have ≥1 row"

        # Act
        r = client.delete(f"/api/v1/works/{wid}")
        assert r.status_code == 204

        with engine.connect() as conn:
            for tbl in direct_tables:
                n = conn.execute(
                    text(f"SELECT COUNT(*) FROM {tbl} WHERE work_id = :w"),
                    {"w": wid},
                ).scalar()
                assert n == 0, f"{tbl} still has {n} rows for work {wid}"
            n = conn.execute(
                text(
                    "SELECT COUNT(*) FROM event_characters ec "
                    "JOIN events e ON ec.event_id = e.id "
                    "WHERE e.work_id = :w"
                ),
                {"w": wid},
            ).scalar()
            assert n == 0, f"event_characters (via events) still has {n} rows"

    def test_delete_work_preserves_llm_audit_log(
        self, client, db_session: Session
    ):
        from tests.conftest import engine
        wid, ids = _make_full_work(client)

        # The chat endpoint was called via _make_full_work; one log exists.
        r = client.get("/api/v1/ai-logs")
        before = [x for x in r.json()["items"] if x["work_id"] == wid]
        assert len(before) == 1, "expected one log row tagged to the work"

        client.delete(f"/api/v1/works/{wid}")

        # The row must remain but with work_id NULL.
        db_session.expire_all()
        with engine.connect() as conn:
            row = conn.execute(
                text(
                    "SELECT id, work_id FROM llm_request_logs WHERE id = :id"
                ),
                {"id": before[0]["id"]},
            ).fetchone()
        assert row is not None, "audit log row should be preserved"
        assert row[1] is None, "audit log.work_id should be SET NULL"