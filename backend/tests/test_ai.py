"""Tests for /api/v1/settings and /api/v1/ai (mocked LLM path)."""
from unittest.mock import patch

import pytest


# =============================================================================
# Settings
# =============================================================================

class TestSettings:
    def test_list_empty(self, client):
        r = client.get("/api/v1/settings")
        assert r.status_code == 200
        assert r.json() == []

    def test_upsert_and_get(self, client):
        r = client.put("/api/v1/settings/ai.model", json={"value": "gpt-4o"})
        assert r.status_code == 200
        assert r.json()["key"] == "ai.model"
        assert r.json()["value"] == "gpt-4o"
        assert r.json()["is_set"] is True

    def test_secret_masked(self, client):
        client.put("/api/v1/settings/ai.api_key", json={"value": "sk-secret-xyz"})
        r = client.get("/api/v1/settings")
        item = next(x for x in r.json() if x["key"] == "ai.api_key")
        assert item["is_secret"] is True
        assert item["value"] == ""  # masked
        assert item["is_set"] is True

    def test_non_secret_visible(self, client):
        client.put("/api/v1/settings/ai.base_url", json={"value": "https://api.deepseek.com/v1"})
        item = next(x for x in client.get("/api/v1/settings").json() if x["key"] == "ai.base_url")
        assert item["value"] == "https://api.deepseek.com/v1"
        assert item["is_secret"] is False

    def test_get_single_404(self, client):
        r = client.get("/api/v1/settings/nonexistent")
        assert r.status_code == 404

    def test_update_existing(self, client):
        client.put("/api/v1/settings/ai.model", json={"value": "first"})
        r = client.put("/api/v1/settings/ai.model", json={"value": "second"})
        assert r.json()["value"] == "second"

    def test_delete(self, client):
        client.put("/api/v1/settings/ai.model", json={"value": "x"})
        r = client.delete("/api/v1/settings/ai.model")
        assert r.status_code == 204
        assert client.get("/api/v1/settings/ai.model").status_code == 404

    def test_delete_404(self, client):
        r = client.delete("/api/v1/settings/nonexistent")
        assert r.status_code == 404

    def test_empty_value_422(self, client):
        r = client.put("/api/v1/settings/ai.model", json={"value": ""})
        assert r.status_code == 422


# =============================================================================
# AI status (no real LLM call)
# =============================================================================

class TestAIStatus:
    def test_status_unconfigured(self, client):
        r = client.get("/api/v1/ai/status")
        assert r.status_code == 200
        body = r.json()
        assert "configured" in body
        assert "base_url" in body
        assert "model" in body


# =============================================================================
# AI suggest endpoints — mocked LLM
# =============================================================================

@pytest.fixture()
def work_id(client):
    return client.post("/api/v1/works", json={"title": "测试", "genre": "玄幻"}).json()["id"]


@pytest.fixture()
def volume_id(client, work_id):
    return client.post(
        f"/api/v1/works/{work_id}/volumes",
        json={"title": "第一卷", "summary": "主角出山"},
    ).json()["id"]


MOCK_VOLUMES_JSON = '{"volumes":[{"title":"第一卷","summary":"出山","target_words":300000}]}'
MOCK_CHAPTERS_JSON = '{"chapters":[{"title":"第一章","summary":"开篇","chapter_type":"opening"}]}'
MOCK_CHARACTER_JSON = '{"character":{"name":"叶无心","aliases":"无名","role":"support"}}'
MOCK_EVENTS_JSON = '{"events":[{"title":"屠村","event_type":"main","importance":5,"description":"x","story_time":"Day 1"}]}'
MOCK_CONSISTENCY_JSON = '{"issues":[],"summary":"OK"}'


@patch("app.ai.client.chat")
def test_suggest_outline(mock_chat, client, work_id):
    mock_chat.return_value = MOCK_VOLUMES_JSON
    r = client.post(
        "/api/v1/ai/suggest/outline",
        json={"work_id": work_id, "volume_count": 3, "target_words": 1_000_000},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["work_id"] == work_id
    assert len(body["volumes"]) == 1
    assert body["volumes"][0]["title"] == "第一卷"
    mock_chat.assert_called_once()


@patch("app.ai.client.chat")
def test_suggest_chapters(mock_chat, client, work_id, volume_id):
    mock_chat.return_value = MOCK_CHAPTERS_JSON
    r = client.post(
        "/api/v1/ai/suggest/chapters",
        json={"work_id": work_id, "volume_id": volume_id, "target_chapter_count": 10},
    )
    assert r.status_code == 200
    assert r.json()["chapters"][0]["title"] == "第一章"


@patch("app.ai.client.chat")
def test_suggest_chapters_wrong_volume(mock_chat, client, work_id):
    mock_chat.return_value = MOCK_CHAPTERS_JSON
    other = client.post("/api/v1/works", json={"title": "other"}).json()["id"]
    vid = client.post(f"/api/v1/works/{other}/volumes", json={"title": "V"}).json()["id"]
    r = client.post(
        "/api/v1/ai/suggest/chapters",
        json={"work_id": work_id, "volume_id": vid},
    )
    assert r.status_code == 400
    assert mock_chat.call_count == 0  # short-circuit before calling


@patch("app.ai.client.chat")
def test_suggest_character(mock_chat, client, work_id):
    mock_chat.return_value = MOCK_CHARACTER_JSON
    r = client.post(
        "/api/v1/ai/suggest/character",
        json={"work_id": work_id, "role": "support"},
    )
    assert r.status_code == 200
    assert r.json()["character"]["name"] == "叶无心"


@patch("app.ai.client.chat")
def test_suggest_event(mock_chat, client, work_id):
    mock_chat.return_value = MOCK_EVENTS_JSON
    r = client.post(
        "/api/v1/ai/suggest/event",
        json={"work_id": work_id, "count": 3},
    )
    assert r.status_code == 200
    assert r.json()["events"][0]["title"] == "屠村"


@patch("app.ai.client.chat")
def test_check_consistency(mock_chat, client, work_id):
    mock_chat.return_value = MOCK_CONSISTENCY_JSON
    r = client.post(
        "/api/v1/ai/check/consistency",
        json={"work_id": work_id, "new_content": "叶无心走进青云山。"},
    )
    assert r.status_code == 200
    assert r.json()["summary"] == "OK"


@patch("app.ai.client.chat")
def test_chat(mock_chat, client, work_id):
    mock_chat.return_value = "建议你注意节奏。"
    r = client.post(
        "/api/v1/ai/chat",
        json={"work_id": work_id, "question": "主角动机合理吗?"},
    )
    assert r.status_code == 200
    assert "建议" in r.json()["answer"]


@patch("app.ai.client.chat")
def test_invalid_json_returns_502(mock_chat, client, work_id):
    mock_chat.return_value = "not a json"
    r = client.post(
        "/api/v1/ai/suggest/outline",
        json={"work_id": work_id, "volume_count": 2},
    )
    assert r.status_code == 502


@patch("app.ai.client.chat")
def test_strips_json_fence(mock_chat, client, work_id):
    mock_chat.return_value = "```json\n" + MOCK_VOLUMES_JSON + "\n```"
    r = client.post(
        "/api/v1/ai/suggest/outline",
        json={"work_id": work_id, "volume_count": 2},
    )
    assert r.status_code == 200
    assert r.json()["volumes"][0]["title"] == "第一卷"


@patch("app.ai.client.chat")
def test_not_configured_returns_503(mock_chat, client, work_id):
    """Without an api key (no env, no settings) all AI calls should 503."""
    from app.ai.client import AIServiceError

    mock_chat.side_effect = AIServiceError("not set", code="not_configured")
    r = client.post(
        "/api/v1/ai/suggest/outline",
        json={"work_id": work_id, "volume_count": 2},
    )
    assert r.status_code == 503

    logs = client.get("/api/v1/ai-logs", params={"status": "not_configured"}).json()["items"]
    assert len(logs) == 1
    assert logs[0]["status"] == "not_configured"


def test_work_not_found(client):
    r = client.post(
        "/api/v1/ai/suggest/outline",
        json={"work_id": 9999, "volume_count": 2},
    )
    assert r.status_code == 404


# =============================================================================
# Continue / Expand
# =============================================================================

@patch("app.ai.client.chat")
def test_suggest_continue(mock_chat, client, work_id):
    cid = client.post(
        f"/api/v1/works/{work_id}/chapters",
        json={"work_id": work_id, "title": "第一章", "content": "他提起剑。"},
    ).json()["id"]
    mock_chat.return_value = "他提起剑,向前一步。风起。\n\n他杀了过去。"
    r = client.post(
        "/api/v1/ai/suggest/continue",
        json={"work_id": work_id, "chapter_id": cid, "target_chars": 200},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["chapter_id"] == cid
    assert "他提起剑" in body["text"] or "风起" in body["text"]
    mock_chat.assert_called_once()


@patch("app.ai.client.chat")
def test_suggest_continue_wrong_chapter_400(mock_chat, client, work_id):
    other = client.post("/api/v1/works", json={"title": "o"}).json()["id"]
    cid = client.post(
        f"/api/v1/works/{other}/chapters",
        json={"work_id": other, "title": "C"},
    ).json()["id"]
    r = client.post(
        "/api/v1/ai/suggest/continue",
        json={"work_id": work_id, "chapter_id": cid},
    )
    assert r.status_code == 400
    assert mock_chat.call_count == 0


@patch("app.ai.client.chat")
def test_suggest_expand(mock_chat, client, work_id):
    mock_chat.return_value = "扩写后的精彩段落..."
    r = client.post(
        "/api/v1/ai/suggest/expand",
        json={"work_id": work_id, "selection": "他推门走进房间,烛火摇曳。", "target_chars": 300},
    )
    assert r.status_code == 200
    assert "扩写" in r.json()["text"]


# =============================================================================
# Completion / 作品补完
# =============================================================================

MOCK_COMPLETION_JSON = """{
  "analysis": {
    "story_core": {"status": "existing", "value": "一个年轻干部来到偏远乡镇。", "reason": "用户已填写"},
    "core_conflict": {"status": "suggested", "value": "主角对抗隐藏的权力网络。", "reason": "由简介推断"},
    "protagonist_goal": {"status": "suggested", "value": "改变当地经济", "reason": "由简介推断"},
    "setting": {"status": "insufficient", "value": "", "reason": "信息不足"},
    "world_rules": {"status": "insufficient", "value": "", "reason": "信息不足"},
    "themes": {"status": "suggested", "value": ["权力", "人性"], "reason": "由题材推断"}
  },
  "extracted_facts": ["现代中国背景"],
  "potential_conflicts": [],
  "missing_critical_information": ["主角的具体身份背景"],
  "completeness": {"story": 60, "character": 30, "world": 20, "style": 50, "planning": 10}
}"""


@patch("app.ai.client.chat")
def test_suggest_completion(mock_chat, client):
    mock_chat.return_value = MOCK_COMPLETION_JSON
    r = client.post(
        "/api/v1/ai/suggest/completion",
        json={
            "story_seed": "一个年轻干部来到偏远乡镇。",
            "raw_idea": "我希望整体节奏很慢。",
            "themes": ["权力"],
            "pace": 3,
            "moods": ["压抑", "克制"],
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["analysis"]["story_core"]["status"] == "existing"
    assert body["analysis"]["core_conflict"]["status"] == "suggested"
    assert body["analysis"]["core_conflict"]["value"] == "主角对抗隐藏的权力网络。"
    assert body["analysis"]["themes"]["value"] == ["权力", "人性"]
    assert body["completeness"]["story"] == 60
    assert body["extracted_facts"] == ["现代中国背景"]
    assert body["missing_critical_information"] == ["主角的具体身份背景"]
    user_msg = mock_chat.call_args.kwargs["user"]
    assert "一个年轻干部来到偏远乡镇。" in user_msg
    mock_chat.assert_called_once()


@patch("app.ai.client.chat")
def test_suggest_completion_with_work_id(mock_chat, client, work_id):
    mock_chat.return_value = MOCK_COMPLETION_JSON
    r = client.post(
        "/api/v1/ai/suggest/completion",
        json={"work_id": work_id, "story_seed": "一句话故事"},
    )
    assert r.status_code == 200


def test_suggest_completion_bad_work_id_404(client):
    r = client.post(
        "/api/v1/ai/suggest/completion",
        json={"work_id": 9999, "story_seed": "x"},
    )
    assert r.status_code == 404


@patch("app.ai.client.chat")
def test_suggest_completion_empty_payload_400(mock_chat, client):
    r = client.post("/api/v1/ai/suggest/completion", json={})
    assert r.status_code == 400
    assert mock_chat.call_count == 0


@patch("app.ai.client.chat")
def test_suggest_completion_blank_values_ignored(mock_chat, client):
    r = client.post(
        "/api/v1/ai/suggest/completion",
        json={"title": "", "story_seed": "", "themes": [], "target_words": 0},
    )
    assert r.status_code == 400
    assert mock_chat.call_count == 0


@patch("app.ai.client.chat")
def test_suggest_completion_lenient_defaults(mock_chat, client):
    mock_chat.return_value = (
        '{"analysis": {"core_conflict": {"status": "suggested", "value": "x", "reason": "r"}}}'
    )
    r = client.post(
        "/api/v1/ai/suggest/completion",
        json={"story_seed": "一个模糊的想法"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["analysis"]["core_conflict"]["value"] == "x"
    assert body["analysis"]["setting"]["status"] == "insufficient"
    assert body["extracted_facts"] == []
    assert body["completeness"]["story"] == 0


@patch("app.ai.client.chat")
def test_suggest_completion_invalid_shape_502(mock_chat, client):
    mock_chat.return_value = '{"analysis": "not an object"}'
    r = client.post(
        "/api/v1/ai/suggest/completion",
        json={"story_seed": "一个模糊的想法"},
    )
    assert r.status_code == 502


@patch("app.ai.client.chat")
def test_suggest_completion_invalid_json_502(mock_chat, client):
    mock_chat.return_value = "not a json"
    r = client.post(
        "/api/v1/ai/suggest/completion",
        json={"story_seed": "一个模糊的想法"},
    )
    assert r.status_code == 502


@patch("app.ai.client.chat")
def test_suggest_completion_not_configured_503(mock_chat, client):
    from app.ai.client import AIServiceError

    mock_chat.side_effect = AIServiceError("not set", code="not_configured")
    r = client.post(
        "/api/v1/ai/suggest/completion",
        json={"story_seed": "一个模糊的想法"},
    )
    assert r.status_code == 503
    logs = client.get("/api/v1/ai-logs", params={"status": "not_configured"}).json()["items"]
    assert len(logs) == 1
    assert logs[0]["endpoint"] == "/ai/suggest/completion"


# =============================================================================
# Prompt catalog (read-only)
# =============================================================================

class TestPromptCatalog:
    def test_list_prompts_returns_nine(self, client):
        r = client.get("/api/v1/ai/prompts")
        assert r.status_code == 200
        names = [p["name"] for p in r.json()]
        assert len(names) == 9

    def test_list_prompts_contains_chat(self, client):
        names = {p["name"] for p in client.get("/api/v1/ai/prompts").json()}
        assert "chat" in names
        for expected in ("outline", "chapters", "character", "event",
                          "consistency", "continue", "expand", "completion"):
            assert expected in names

    def test_list_prompts_stable_order(self, client):
        names = [p["name"] for p in client.get("/api/v1/ai/prompts").json()]
        assert names == [
            "outline", "chapters", "character", "event",
            "consistency", "continue", "expand", "chat", "completion",
        ]

    def test_summary_shape(self, client):
        item = client.get("/api/v1/ai/prompts").json()[0]
        assert set(item.keys()) == {"name", "json_mode", "temperature"}

    def test_get_prompt_known(self, client):
        for name in ("outline", "chapters", "character", "event",
                      "consistency", "continue", "expand", "chat", "completion"):
            r = client.get(f"/api/v1/ai/prompts/{name}")
            assert r.status_code == 200, name
            body = r.json()
            assert body["name"] == name
            assert isinstance(body["json_mode"], bool)
            assert isinstance(body["temperature"], (int, float))
            assert body["system"]
            assert body["user_template"]

    def test_get_prompt_404(self, client):
        r = client.get("/api/v1/ai/prompts/nonexistent")
        assert r.status_code == 404

    def test_get_prompt_chat_renders(self, client):
        """free_chat now goes through CHAT_PROMPT — make sure detail is consistent."""
        detail = client.get("/api/v1/ai/prompts/chat").json()
        assert "{context}" in detail["user_template"]
        assert "{question}" in detail["user_template"]