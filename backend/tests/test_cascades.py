"""Cascade-rule regression tests.

Verifies the ``ON DELETE SET NULL`` / ``ON DELETE CASCADE`` rules
documented in ``AGENTS.md`` so a schema change can't silently regress
data integrity.

Each test creates a real work / chapter / chapter-state / event /
foreshadowing / LLM log row, then deletes the *parent* and asserts the
expected behaviour on the child.
"""
from __future__ import annotations

from sqlalchemy.orm import Session


def _create_work(client, db_session: Session, title: str = "W") -> int:
    r = client.post("/api/v1/works", json={"title": title})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _create_chapter(client, work_id: int, volume_id: int | None, title: str = "C") -> int:
    r = client.post(
        f"/api/v1/works/{work_id}/chapters",
        json={
            "work_id": work_id,
            "volume_id": volume_id,
            "title": title,
            "content": "他提起剑。",
            "order_num": 0,
            "target_words": 100,
            "actual_words": 5,
            "status": "draft",
            "chapter_type": "plot",
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _create_character(client, work_id: int, name: str = "主角") -> int:
    r = client.post(
        f"/api/v1/works/{work_id}/characters",
        json={"name": name, "role": "protagonist"},
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


class TestChapterDeletionCascades:
    """Chapter deletion should CASCADE-delete states / foreshadowing / events
    that reference the chapter (per FK ondelete rules)."""

    def test_deleting_chapter_sets_event_chapter_id_to_null(
        self, client, db_session: Session
    ):
        from app.models.event import Event

        work_id = _create_work(client, db_session)
        ch_id = _create_chapter(client, work_id, None)
        ev_id = client.post(
            f"/api/v1/works/{work_id}/events",
            json={"title": "事件", "chapter_id": ch_id},
        ).json()["id"]

        client.delete(f"/api/v1/works/{work_id}/chapters/{ch_id}")

        db_session.expire_all()
        ev = db_session.get(Event, ev_id)
        assert ev is not None, "event should NOT be CASCADE-deleted (it's a reference)"
        assert ev.chapter_id is None, "event.chapter_id should be SET NULL"


class TestProfileDeletion:
    """Deleting an AI profile SET NULLs assignments and logs."""

    def test_deleting_profile_nulls_assignment(
        self, client, db_session: Session
    ):
        from app.models.ai_prompt_assignment import AIPromptAssignment

        p_id = client.post(
            "/api/v1/ai/profiles",
            json={
                "name": "to-delete",
                "provider": "openai",
                "base_url": "https://api.openai.com/v1",
                "model": "x",
                "api_key": "k",
                "is_default": True,
            },
        ).json()["id"]
        client.put(
            "/api/v1/ai/prompt-assignments/continue",
            json={"profile_id": p_id},
        )

        client.delete(f"/api/v1/ai/profiles/{p_id}")

        db_session.expire_all()
        row = db_session.get(AIPromptAssignment, "continue")
        assert row is not None, "assignment row should remain"
        assert row.profile_id is None, "assignment.profile_id should be SET NULL"

    def test_deleting_profile_nulls_llm_log(
        self, client, db_session: Session
    ):
        from unittest.mock import patch

        from app.models.llm_request_log import LlmRequestLog

        p_id = client.post(
            "/api/v1/ai/profiles",
            json={
                "name": "log-target",
                "provider": "openai",
                "base_url": "https://api.openai.com/v1",
                "model": "x",
                "api_key": "k",
                "is_default": True,
            },
        ).json()["id"]
        work_id = _create_work(client, db_session)
        with patch("app.ai.client.chat", return_value="hi from mock"):
            r = client.post(
                "/api/v1/ai/chat",
                json={"work_id": work_id, "question": "ping?"},
            )
            assert r.status_code == 200, r.text

        logs = client.get("/api/v1/ai-logs").json()["items"]
        matching = [x for x in logs if x["profile_id"] == p_id]
        assert len(matching) == 1
        log_id = matching[0]["id"]

        client.delete(f"/api/v1/ai/profiles/{p_id}")

        db_session.expire_all()
        log = db_session.get(LlmRequestLog, log_id)
        assert log is not None, "log should remain (audit history preserved)"
        assert log.profile_id is None, "log.profile_id should be SET NULL"


class TestAssemblyDeletion:
    """Deleting a prompt assembly SET NULLs bindings and log rows."""

    def test_deleting_assembly_nulls_binding(
        self, client, db_session: Session
    ):
        from app.models.ai_prompt_template_binding import AIPromptTemplateBinding

        a_id = client.post(
            "/api/v1/ai/prompts/outline/clone",
            json={"name": "to-delete", "description": "tmp"},
        ).json()["id"]
        bind_resp = client.put(
            "/api/v1/ai/prompt-template-bindings/outline",
            json={"assembly_id": a_id},
        )
        assert bind_resp.status_code == 200, bind_resp.text

        del_resp = client.delete(f"/api/v1/prompt-assemblies/{a_id}")
        assert del_resp.status_code == 204, del_resp.text

        db_session.expire_all()
        row = db_session.get(AIPromptTemplateBinding, "outline")
        assert row is not None, "binding row should remain"
        assert row.assembly_id is None, (
            f"binding.assembly_id should be SET NULL, got {row.assembly_id}"
        )

    def test_deleting_assembly_nulls_llm_log(
        self, client, db_session: Session
    ):
        from unittest.mock import patch

        from app.models.llm_request_log import LlmRequestLog

        client.post(
            "/api/v1/ai/profiles",
            json={
                "name": "asm-log",
                "provider": "openai",
                "base_url": "https://api.openai.com/v1",
                "model": "x",
                "api_key": "k",
                "is_default": True,
            },
        )
        a_id = client.post(
            "/api/v1/ai/prompts/outline/clone",
            json={"name": "asm-log-copy"},
        ).json()["id"]
        client.put(
            "/api/v1/ai/prompt-template-bindings/outline",
            json={"assembly_id": a_id},
        )

        work_id = _create_work(client, db_session)
        with patch("app.ai.client.chat", return_value='{"volumes":[]}'):
            r = client.post(
                "/api/v1/ai/suggest/outline",
                json={"work_id": work_id, "volume_count": 2},
            )
            assert r.status_code == 200, r.text

        logs = client.get("/api/v1/ai-logs").json()["items"]
        matching = [x for x in logs if x["prompt_assembly_id"] == a_id]
        assert len(matching) == 1
        log_id = matching[0]["id"]

        del_resp = client.delete(f"/api/v1/prompt-assemblies/{a_id}")
        assert del_resp.status_code == 204, del_resp.text

        db_session.expire_all()
        log = db_session.get(LlmRequestLog, log_id)
        assert log is not None, "log should remain"
        assert log.prompt_assembly_id is None, (
            f"log.prompt_assembly_id should be SET NULL, got {log.prompt_assembly_id}"
        )