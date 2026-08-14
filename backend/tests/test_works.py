"""Tests for /api/v1/works."""
import pytest


def _payload(**over):
    base = {
        "title": "雾隐山河",
        "subtitle": "少年离乡",
        "genre": "玄幻",
        "style": "热血",
        "pov": "第三人称",
        "description": "一个少年走出大山。",
        "target_words": 1000000,
        "status": "draft",
    }
    base.update(over)
    return base


class TestListWorks:
    def test_empty(self, client):
        r = client.get("/api/v1/works")
        assert r.status_code == 200
        assert r.json() == []

    def test_returns_list(self, client):
        client.post("/api/v1/works", json=_payload(title="A"))
        client.post("/api/v1/works", json=_payload(title="B"))
        r = client.get("/api/v1/works")
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_filter_by_status(self, client):
        client.post("/api/v1/works", json=_payload(title="A", status="draft"))
        client.post("/api/v1/works", json=_payload(title="B", status="writing"))
        r = client.get("/api/v1/works", params={"status": "writing"})
        assert len(r.json()) == 1
        assert r.json()[0]["title"] == "B"


class TestSearchWorks:
    def test_search_substring(self, client):
        client.post("/api/v1/works", json=_payload(title="青云问道录"))
        client.post("/api/v1/works", json=_payload(title="雾隐山河"))
        r = client.get("/api/v1/works", params={"q": "青云"})
        assert len(r.json()) == 1
        assert r.json()[0]["title"] == "青云问道录"

    def test_search_no_match(self, client):
        client.post("/api/v1/works", json=_payload(title="A"))
        r = client.get("/api/v1/works", params={"q": "zzz"})
        assert r.json() == []


class TestCreateWork:
    def test_minimal(self, client):
        r = client.post("/api/v1/works", json={"title": "测试"})
        assert r.status_code == 201
        body = r.json()
        assert body["title"] == "测试"
        assert body["id"] > 0
        assert body["status"] == "draft"
        assert body["current_words"] == 0
        assert body["target_words"] == 0

    def test_full(self, client):
        r = client.post("/api/v1/works", json=_payload())
        assert r.status_code == 201
        body = r.json()
        assert body["title"] == "雾隐山河"
        assert body["genre"] == "玄幻"
        assert body["target_words"] == 1000000

    def test_full_with_creation_fields(self, client):
        r = client.post(
            "/api/v1/works",
            json=_payload(
                story_seed="一个年轻干部来到偏远乡镇。",
                core_conflict="理想主义者对抗隐藏的权力网络。",
                protagonist_goal="改变家乡",
                themes=["权力", "人性"],
                era="现代",
                setting="虚构的现代中国山区县城。",
                world_rules="整体世界基本现实。",
                pace=3,
                realism=8,
                prose=4,
                moods=["压抑", "克制"],
                length_type="长篇",
                stage="只有灵感",
            ),
        )
        assert r.status_code == 201
        body = r.json()
        assert body["story_seed"] == "一个年轻干部来到偏远乡镇。"
        assert body["core_conflict"] == "理想主义者对抗隐藏的权力网络。"
        assert body["protagonist_goal"] == "改变家乡"
        assert body["themes"] == ["权力", "人性"]
        assert body["era"] == "现代"
        assert body["setting"] == "虚构的现代中国山区县城。"
        assert body["world_rules"] == "整体世界基本现实。"
        assert body["pace"] == 3
        assert body["realism"] == 8
        assert body["prose"] == 4
        assert body["moods"] == ["压抑", "克制"]
        assert body["length_type"] == "长篇"
        assert body["stage"] == "只有灵感"

    def test_creation_fields_default_null(self, client):
        r = client.post("/api/v1/works", json={"title": "测试"})
        body = r.json()
        assert body["story_seed"] is None
        assert body["themes"] is None
        assert body["pace"] is None
        assert body["moods"] is None
        assert body["length_type"] is None
        assert body["stage"] is None

    def test_pace_out_of_range_422(self, client):
        assert client.post("/api/v1/works", json={"title": "x", "pace": 0}).status_code == 422
        assert client.post("/api/v1/works", json={"title": "x", "pace": 11}).status_code == 422

    def test_missing_title_422(self, client):
        r = client.post("/api/v1/works", json={"genre": "玄幻"})
        assert r.status_code == 422

    def test_empty_title_422(self, client):
        r = client.post("/api/v1/works", json={"title": ""})
        assert r.status_code == 422

    def test_title_too_long_422(self, client):
        r = client.post("/api/v1/works", json={"title": "x" * 201})
        assert r.status_code == 422

    def test_negative_target_words_422(self, client):
        r = client.post("/api/v1/works", json={"title": "x", "target_words": -1})
        assert r.status_code == 422

    def test_returns_timestamps(self, client):
        r = client.post("/api/v1/works", json={"title": "时间"})
        body = r.json()
        assert "created_at" in body
        assert "updated_at" in body
        assert body["created_at"] is not None


class TestGetWork:
    def test_found(self, client):
        wid = client.post("/api/v1/works", json={"title": "A"}).json()["id"]
        r = client.get(f"/api/v1/works/{wid}")
        assert r.status_code == 200
        assert r.json()["id"] == wid

    def test_404(self, client):
        r = client.get("/api/v1/works/99999")
        assert r.status_code == 404
        assert r.json()["detail"] == "Work not found"


class TestUpdateWork:
    def test_partial_update(self, client):
        wid = client.post("/api/v1/works", json=_payload()).json()["id"]
        r = client.put(f"/api/v1/works/{wid}", json={"status": "writing"})
        assert r.status_code == 200
        assert r.json()["status"] == "writing"
        assert r.json()["title"] == "雾隐山河"

    def test_multiple_fields(self, client):
        wid = client.post("/api/v1/works", json=_payload()).json()["id"]
        r = client.put(
            f"/api/v1/works/{wid}",
            json={"title": "新名", "target_words": 5000, "current_words": 100},
        )
        body = r.json()
        assert body["title"] == "新名"
        assert body["target_words"] == 5000
        assert body["current_words"] == 100

    def test_update_404(self, client):
        r = client.put("/api/v1/works/99999", json={"status": "writing"})
        assert r.status_code == 404

    def test_update_invalid_status_still_accepted_as_string(self, client):
        """schema does not constrain status enum - by design."""
        wid = client.post("/api/v1/works", json=_payload()).json()["id"]
        r = client.put(f"/api/v1/works/{wid}", json={"status": "unknown_state"})
        assert r.status_code == 200
        assert r.json()["status"] == "unknown_state"

    def test_update_creation_fields(self, client):
        wid = client.post("/api/v1/works", json={"title": "A"}).json()["id"]
        r = client.put(
            f"/api/v1/works/{wid}",
            json={
                "story_seed": "一句话故事",
                "themes": ["成长"],
                "pace": 7,
                "moods": ["热血"],
                "stage": "准备开始正文",
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert body["story_seed"] == "一句话故事"
        assert body["themes"] == ["成长"]
        assert body["pace"] == 7
        assert body["moods"] == ["热血"]
        assert body["stage"] == "准备开始正文"

    def test_update_clear_creation_field_to_null(self, client):
        wid = client.post(
            "/api/v1/works", json=_payload(story_seed="原值", pace=5)
        ).json()["id"]
        r = client.put(f"/api/v1/works/{wid}", json={"story_seed": None, "pace": None})
        assert r.status_code == 200
        assert r.json()["story_seed"] is None
        assert r.json()["pace"] is None


class TestDeleteWork:
    def test_delete(self, client):
        wid = client.post("/api/v1/works", json={"title": "A"}).json()["id"]
        r = client.delete(f"/api/v1/works/{wid}")
        assert r.status_code == 204
        assert client.get(f"/api/v1/works/{wid}").status_code == 404

    def test_delete_404(self, client):
        r = client.delete("/api/v1/works/99999")
        assert r.status_code == 404


class TestMetaEndpoints:
    def test_health(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_root(self, client):
        r = client.get("/")
        assert r.status_code == 200
        assert "docs" in r.json()


@pytest.fixture()
def two_works(client):
    a = client.post("/api/v1/works", json=_payload(title="甲", status="writing")).json()
    b = client.post("/api/v1/works", json=_payload(title="乙", status="draft")).json()
    return a, b


class TestOrdering:
    def test_newer_first(self, client):
        a = client.post("/api/v1/works", json={"title": "older"}).json()
        b = client.post("/api/v1/works", json={"title": "newer"}).json()
        works = client.get("/api/v1/works").json()
        # newer updated_at should be first (subsecond precision via strftime)
        assert works[0]["id"] == b["id"]
        assert works[1]["id"] == a["id"]