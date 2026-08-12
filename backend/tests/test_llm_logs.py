"""Tests for the LLM request/response audit log.

Covers:
- Log capture on success / ``not_configured`` / generic ``AIServiceError``
- ``/api/v1/ai-logs`` list / detail / delete endpoints with filters
- Cascade: deleting a work nulls ``work_id`` but the log row stays
- Cap: inserting past ``MAX_LOGS`` trims the oldest rows
"""
from unittest.mock import patch

import pytest

from app.models.llm_request_log import LlmRequestLog
from app.services import llm_log as service


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture()
def work_id(client):
    return client.post("/api/v1/works", json={"title": "测试作品"}).json()["id"]


@pytest.fixture()
def work_id_b(client):
    return client.post("/api/v1/works", json={"title": "另一部"}).json()["id"]


# =============================================================================
# Capture on each AI call
# =============================================================================

class TestLogCapture:
    @patch("app.ai.client.chat")
    def test_outline_success_logged(self, mock_chat, client, work_id):
        mock_chat.return_value = '{"volumes":[{"title":"第一卷","summary":"出山","target_words":300000}]}'
        r = client.post(
            "/api/v1/ai/suggest/outline",
            json={"work_id": work_id, "volume_count": 3},
        )
        assert r.status_code == 200

        logs = client.get("/api/v1/ai-logs", params={"work_id": work_id}).json()["items"]
        assert len(logs) == 1
        log = logs[0]
        assert log["prompt_name"] == "outline"
        assert log["endpoint"] == "/ai/suggest/outline"
        assert log["work_id"] == work_id
        assert log["status"] == "ok"
        assert log["duration_ms"] >= 0
        assert log["user_preview"]
        assert log["response_preview"]
        assert log["error"] is None

    @patch("app.ai.client.chat")
    def test_chat_success_logged_with_work(self, mock_chat, client, work_id):
        mock_chat.return_value = "简短建议。"
        client.post(
            "/api/v1/ai/chat",
            json={"work_id": work_id, "question": "节奏合理吗?"},
        )
        logs = client.get(
            "/api/v1/ai-logs", params={"work_id": work_id, "prompt_name": "chat"}
        ).json()["items"]
        assert len(logs) == 1
        assert logs[0]["status"] == "ok"
        assert "节奏" in logs[0]["user_preview"] or "节奏" in logs[0]["response_preview"]

    @patch("app.ai.client.chat")
    def test_chat_without_work_logged(self, mock_chat, client):
        mock_chat.return_value = "好"
        client.post("/api/v1/ai/chat", json={"question": "ping"})
        logs = client.get(
            "/api/v1/ai-logs", params={"prompt_name": "chat"}
        ).json()["items"]
        assert len(logs) == 1
        assert logs[0]["work_id"] is None

    @patch("app.ai.client.chat")
    def test_not_configured_logged(self, mock_chat, client, work_id):
        from app.ai.client import AIServiceError

        mock_chat.side_effect = AIServiceError("not set", code="not_configured")
        r = client.post(
            "/api/v1/ai/suggest/outline",
            json={"work_id": work_id, "volume_count": 2},
        )
        # 503 from the route
        assert r.status_code == 503

        logs = client.get("/api/v1/ai-logs", params={"status": "not_configured"}).json()["items"]
        assert len(logs) == 1
        assert logs[0]["status"] == "not_configured"
        assert "not set" in (logs[0]["error"] or "")

    @patch("app.ai.client.chat")
    def test_generic_error_logged(self, mock_chat, client, work_id):
        from app.ai.client import AIServiceError

        mock_chat.side_effect = AIServiceError("upstream 500", code="ai_error")
        r = client.post(
            "/api/v1/ai/suggest/character",
            json={"work_id": work_id, "role": "support"},
        )
        assert r.status_code == 502

        logs = client.get(
            "/api/v1/ai-logs", params={"prompt_name": "character", "status": "error"}
        ).json()["items"]
        assert len(logs) == 1
        assert logs[0]["status"] == "error"
        assert "upstream" in (logs[0]["error"] or "")

    @patch("app.ai.client.chat")
    def test_continue_success(self, mock_chat, client, work_id):
        cid = client.post(
            f"/api/v1/works/{work_id}/chapters",
            json={"work_id": work_id, "title": "第一章", "content": "他提剑。"},
        ).json()["id"]
        mock_chat.return_value = "续写段落..."
        r = client.post(
            "/api/v1/ai/suggest/continue",
            json={"work_id": work_id, "chapter_id": cid, "target_chars": 200},
        )
        assert r.status_code == 200
        logs = client.get(
            "/api/v1/ai-logs", params={"prompt_name": "continue"}
        ).json()["items"]
        assert len(logs) == 1
        assert logs[0]["endpoint"] == "/ai/suggest/continue"
        assert logs[0]["status"] == "ok"

    @patch("app.ai.client.chat")
    def test_expand_success(self, mock_chat, client, work_id):
        mock_chat.return_value = "扩写后..."
        r = client.post(
            "/api/v1/ai/suggest/expand",
            json={"work_id": work_id, "selection": "原文片段足够长,不会触发 min_length 校验", "target_chars": 500},
        )
        assert r.status_code == 200
        logs = client.get(
            "/api/v1/ai-logs", params={"prompt_name": "expand"}
        ).json()["items"]
        assert len(logs) == 1
        assert logs[0]["endpoint"] == "/ai/suggest/expand"


# =============================================================================
# List / detail / delete endpoints
# =============================================================================

class TestListEndpoint:
    @patch("app.ai.client.chat")
    def test_empty(self, mock_chat, client):
        r = client.get("/api/v1/ai-logs")
        assert r.status_code == 200
        body = r.json()
        assert body["items"] == []
        assert body["total"] == 0
        assert body["page"] == 1
        assert body["page_size"] == 20

    @patch("app.ai.client.chat")
    def test_filter_by_work(self, mock_chat, client, work_id, work_id_b):
        mock_chat.return_value = "ok"
        # 2 calls under work A, 1 under work B
        client.post(
            "/api/v1/ai/chat",
            json={"work_id": work_id, "question": "q1"},
        )
        client.post(
            "/api/v1/ai/chat",
            json={"work_id": work_id, "question": "q2"},
        )
        client.post(
            "/api/v1/ai/chat",
            json={"work_id": work_id_b, "question": "q3"},
        )

        a = client.get("/api/v1/ai-logs", params={"work_id": work_id}).json()
        b = client.get("/api/v1/ai-logs", params={"work_id": work_id_b}).json()
        assert a["total"] == 2
        assert b["total"] == 1

    @patch("app.ai.client.chat")
    def test_filter_by_prompt(self, mock_chat, client, work_id):
        mock_chat.return_value = '{"character":{"name":"X"}}'
        client.post(
            "/api/v1/ai/suggest/character",
            json={"work_id": work_id, "role": "support"},
        )
        client.post(
            "/api/v1/ai/chat",
            json={"work_id": work_id, "question": "q"},
        )
        only_char = client.get(
            "/api/v1/ai-logs", params={"prompt_name": "character"}
        ).json()
        only_chat = client.get(
            "/api/v1/ai-logs", params={"prompt_name": "chat"}
        ).json()
        assert only_char["total"] == 1
        assert only_chat["total"] == 1

    @patch("app.ai.client.chat")
    def test_pagination(self, mock_chat, client, work_id):
        mock_chat.return_value = "ok"
        for i in range(5):
            client.post(
                "/api/v1/ai/chat",
                json={"work_id": work_id, "question": f"q{i}"},
            )
        page1 = client.get(
            "/api/v1/ai-logs", params={"page": 1, "page_size": 2}
        ).json()
        page2 = client.get(
            "/api/v1/ai-logs", params={"page": 2, "page_size": 2}
        ).json()
        page3 = client.get(
            "/api/v1/ai-logs", params={"page": 3, "page_size": 2}
        ).json()
        assert page1["total"] == 5
        assert page1["page_size"] == 2
        assert len(page1["items"]) == 2
        assert len(page2["items"]) == 2
        assert len(page3["items"]) == 1
        # ordered newest-first
        assert page1["items"][0]["id"] > page2["items"][0]["id"]
        assert page2["items"][0]["id"] > page3["items"][0]["id"]


class TestDetailEndpoint:
    @patch("app.ai.client.chat")
    def test_get_full(self, mock_chat, client, work_id):
        mock_chat.return_value = "完整回答:在第二幕加入伏笔。"
        client.post(
            "/api/v1/ai/chat",
            json={"work_id": work_id, "question": "q"},
        )
        log_id = client.get("/api/v1/ai-logs").json()["items"][0]["id"]
        body = client.get(f"/api/v1/ai-logs/{log_id}").json()
        assert body["id"] == log_id
        assert body["prompt_name"] == "chat"
        assert body["status"] == "ok"
        assert "完整回答" in body["response"]
        assert body["system"]  # system prompt was filled in
        assert "q" in body["user"]

    def test_get_404(self, client):
        r = client.get("/api/v1/ai-logs/9999")
        assert r.status_code == 404


class TestDeleteEndpoint:
    @patch("app.ai.client.chat")
    def test_delete_one(self, mock_chat, client, work_id):
        mock_chat.return_value = "ok"
        client.post("/api/v1/ai/chat", json={"work_id": work_id, "question": "q"})
        log_id = client.get("/api/v1/ai-logs").json()["items"][0]["id"]

        r = client.delete(f"/api/v1/ai-logs/{log_id}")
        assert r.status_code == 204
        assert client.get("/api/v1/ai-logs").json()["total"] == 0
        assert client.get(f"/api/v1/ai-logs/{log_id}").status_code == 404

    def test_delete_404(self, client):
        r = client.delete("/api/v1/ai-logs/9999")
        assert r.status_code == 404

    @patch("app.ai.client.chat")
    def test_clear_all(self, mock_chat, client, work_id):
        mock_chat.return_value = "ok"
        for i in range(3):
            client.post(
                "/api/v1/ai/chat",
                json={"work_id": work_id, "question": f"q{i}"},
            )
        r = client.delete("/api/v1/ai-logs")
        assert r.status_code == 200
        assert r.json()["deleted"] == 3
        assert client.get("/api/v1/ai-logs").json()["total"] == 0

    @patch("app.ai.client.chat")
    def test_clear_with_filter(self, mock_chat, client, work_id, work_id_b):
        mock_chat.return_value = "ok"
        for _ in range(2):
            client.post("/api/v1/ai/chat", json={"work_id": work_id, "question": "a"})
        client.post("/api/v1/ai/chat", json={"work_id": work_id_b, "question": "b"})
        r = client.delete("/api/v1/ai-logs", params={"work_id": work_id})
        assert r.json()["deleted"] == 2
        # only B's log remains
        assert client.get("/api/v1/ai-logs").json()["total"] == 1
        remaining = client.get("/api/v1/ai-logs").json()["items"][0]
        assert remaining["work_id"] == work_id_b


# =============================================================================
# Cascade: work deletion sets work_id to NULL
# =============================================================================


class TestCascade:
    @patch("app.ai.client.chat")
    def test_delete_work_nulls_work_id(self, mock_chat, client, work_id, db_session):
        mock_chat.return_value = "ok"
        client.post("/api/v1/ai/chat", json={"work_id": work_id, "question": "q"})

        # delete the work via the API
        r = client.delete(f"/api/v1/works/{work_id}")
        assert r.status_code == 204

        # the log row should still exist, with work_id = NULL
        rows = db_session.query(LlmRequestLog).all()
        assert len(rows) == 1
        assert rows[0].work_id is None
        assert rows[0].prompt_name == "chat"
        # and the list endpoint still returns it
        api_list = client.get("/api/v1/ai-logs").json()
        assert api_list["total"] == 1
        assert api_list["items"][0]["work_id"] is None


# =============================================================================
# Cap: inserting past MAX_LOGS trims oldest
# =============================================================================


class TestCap:
    def test_record_caps_at_max_logs(self, db_session):
        cap = service.MAX_LOGS
        for i in range(cap + 10):
            service.record(
                db_session,
                prompt_name="outline",
                endpoint="/ai/suggest/outline",
                system="sys",
                user=f"user-{i}",
                status="ok",
                response=f"resp-{i}",
            )
        total = db_session.query(LlmRequestLog).count()
        assert total == cap
        # the oldest 10 must be gone — the remaining 1000 are user-990..user-999
        # the oldest remaining row should correspond to user index 10 (i.e. user 10)
        oldest_user = db_session.query(LlmRequestLog.user).order_by(
            LlmRequestLog.created_at.asc(), LlmRequestLog.id.asc()
        ).first()[0]
        assert oldest_user == "user-10"
