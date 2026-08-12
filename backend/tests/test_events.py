"""Tests for /api/v1/works/{wid}/events and related."""
import pytest


@pytest.fixture()
def work_id(client):
    return client.post("/api/v1/works", json={"title": "测试"}).json()["id"]


@pytest.fixture()
def chapter_id(client, work_id):
    return client.post(
        f"/api/v1/works/{work_id}/chapters",
        json={"work_id": work_id, "title": "第一章"},
    ).json()["id"]


@pytest.fixture()
def char_id(client, work_id):
    return client.post(
        f"/api/v1/works/{work_id}/characters",
        json={"name": "林惊羽", "role": "protagonist"},
    ).json()["id"]


# =============================================================================
# Events CRUD
# =============================================================================

class TestListEvents:
    def test_empty(self, client, work_id):
        r = client.get(f"/api/v1/works/{work_id}/events")
        assert r.status_code == 200
        assert r.json() == []

    def test_404_work(self, client):
        r = client.get("/api/v1/works/9999/events")
        assert r.status_code == 404

    def test_filter_by_type(self, client, work_id):
        client.post(f"/api/v1/works/{work_id}/events", json={"title": "A", "event_type": "main"})
        client.post(f"/api/v1/works/{work_id}/events", json={"title": "B", "event_type": "foreshadow"})
        r = client.get(f"/api/v1/works/{work_id}/events", params={"event_type": "foreshadow"})
        assert len(r.json()) == 1
        assert r.json()[0]["title"] == "B"

    def test_filter_by_status(self, client, work_id):
        client.post(f"/api/v1/works/{work_id}/events", json={"title": "A", "status": "planned"})
        client.post(f"/api/v1/works/{work_id}/events", json={"title": "B", "status": "resolved"})
        r = client.get(f"/api/v1/works/{work_id}/events", params={"status": "resolved"})
        assert len(r.json()) == 1

    def test_ordering_by_story_time(self, client, work_id):
        # null/empty story_time goes last, then ascending string
        client.post(f"/api/v1/works/{work_id}/events", json={"title": "no-time"})
        client.post(f"/api/v1/works/{work_id}/events", json={"title": "later", "story_time": "Day 30"})
        client.post(f"/api/v1/works/{work_id}/events", json={"title": "earlier", "story_time": "Day 1"})
        es = client.get(f"/api/v1/works/{work_id}/events").json()
        assert [e["title"] for e in es] == ["earlier", "later", "no-time"]


class TestCreateEvent:
    def test_minimal(self, client, work_id):
        r = client.post(f"/api/v1/works/{work_id}/events", json={"title": "屠村之夜"})
        assert r.status_code == 201
        e = r.json()
        assert e["title"] == "屠村之夜"
        assert e["event_type"] == "main"
        assert e["status"] == "planned"
        assert e["importance"] == 3

    def test_full(self, client, work_id, chapter_id):
        r = client.post(
            f"/api/v1/works/{work_id}/events",
            json={
                "title": "复仇之夜",
                "description": "主角夜袭仇家",
                "event_type": "climax",
                "story_time": "Day 90",
                "location": "青云山",
                "importance": 5,
                "status": "active",
                "chapter_id": chapter_id,
                "notes": "高潮戏",
            },
        )
        e = r.json()
        assert e["chapter_id"] == chapter_id
        assert e["importance"] == 5
        assert e["location"] == "青云山"

    def test_importance_out_of_range_422(self, client, work_id):
        r = client.post(f"/api/v1/works/{work_id}/events", json={"title": "X", "importance": 6})
        assert r.status_code == 422

    def test_chapter_from_other_work_400(self, client, work_id):
        other = client.post("/api/v1/works", json={"title": "other"}).json()["id"]
        cid = client.post(f"/api/v1/works/{other}/chapters", json={"work_id": other, "title": "C"}).json()["id"]
        r = client.post(f"/api/v1/works/{work_id}/events", json={"title": "X", "chapter_id": cid})
        assert r.status_code == 400

    def test_404_work(self, client):
        r = client.post("/api/v1/works/9999/events", json={"title": "X"})
        assert r.status_code == 404


class TestGetEvent:
    def test_returns_with_relations(self, client, work_id, char_id):
        eid = client.post(f"/api/v1/works/{work_id}/events", json={"title": "A"}).json()["id"]
        client.post(
            f"/api/v1/works/{work_id}/events/{eid}/characters",
            json={"character_id": char_id, "role": "initiator"},
        )
        r = client.get(f"/api/v1/works/{work_id}/events/{eid}")
        assert r.status_code == 200
        body = r.json()
        assert body["title"] == "A"
        assert len(body["character_links"]) == 1
        assert body["character_links"][0]["role"] == "initiator"
        assert body["links_out"] == []
        assert body["links_in"] == []

    def test_wrong_work_404(self, client, work_id):
        eid = client.post(f"/api/v1/works/{work_id}/events", json={"title": "A"}).json()["id"]
        other = client.post("/api/v1/works", json={"title": "o"}).json()["id"]
        r = client.get(f"/api/v1/works/{other}/events/{eid}")
        assert r.status_code == 404


class TestUpdateEvent:
    def test_partial(self, client, work_id):
        eid = client.post(f"/api/v1/works/{work_id}/events", json={"title": "A"}).json()["id"]
        r = client.put(
            f"/api/v1/works/{work_id}/events/{eid}",
            json={"title": "新名", "status": "resolved", "importance": 5},
        )
        assert r.json()["title"] == "新名"
        assert r.json()["status"] == "resolved"


class TestDeleteEvent:
    def test_delete(self, client, work_id):
        eid = client.post(f"/api/v1/works/{work_id}/events", json={"title": "A"}).json()["id"]
        r = client.delete(f"/api/v1/works/{work_id}/events/{eid}")
        assert r.status_code == 204


# =============================================================================
# Event ↔ Character
# =============================================================================

class TestEventCharacters:
    def test_add(self, client, work_id, char_id):
        eid = client.post(f"/api/v1/works/{work_id}/events", json={"title": "A"}).json()["id"]
        r = client.post(
            f"/api/v1/works/{work_id}/events/{eid}/characters",
            json={"character_id": char_id, "role": "witness"},
        )
        assert r.status_code == 201
        assert r.json()["role"] == "witness"

    def test_duplicate_409(self, client, work_id, char_id):
        eid = client.post(f"/api/v1/works/{work_id}/events", json={"title": "A"}).json()["id"]
        client.post(f"/api/v1/works/{work_id}/events/{eid}/characters", json={"character_id": char_id})
        r = client.post(f"/api/v1/works/{work_id}/events/{eid}/characters", json={"character_id": char_id})
        assert r.status_code == 409

    def test_character_from_other_work_400(self, client, work_id, char_id):
        eid = client.post(f"/api/v1/works/{work_id}/events", json={"title": "A"}).json()["id"]
        other = client.post("/api/v1/works", json={"title": "o"}).json()["id"]
        cid2 = client.post(f"/api/v1/works/{other}/characters", json={"name": "X"}).json()["id"]
        r = client.post(
            f"/api/v1/works/{work_id}/events/{eid}/characters",
            json={"character_id": cid2},
        )
        assert r.status_code == 400

    def test_remove(self, client, work_id, char_id):
        eid = client.post(f"/api/v1/works/{work_id}/events", json={"title": "A"}).json()["id"]
        link_id = client.post(
            f"/api/v1/works/{work_id}/events/{eid}/characters",
            json={"character_id": char_id},
        ).json()["id"]
        r = client.delete(f"/api/v1/works/{work_id}/events/{eid}/characters/{link_id}")
        assert r.status_code == 204

    def test_event_delete_cascades_links(self, client, work_id, char_id):
        eid = client.post(f"/api/v1/works/{work_id}/events", json={"title": "A"}).json()["id"]
        client.post(f"/api/v1/works/{work_id}/events/{eid}/characters", json={"character_id": char_id})
        client.delete(f"/api/v1/works/{work_id}/events/{eid}")
        e2 = client.post(f"/api/v1/works/{work_id}/events", json={"title": "B"}).json()["id"]
        body = client.get(f"/api/v1/works/{work_id}/events/{e2}").json()
        assert body["character_links"] == []  # confirm DB still consistent


# =============================================================================
# Event ↔ Event links
# =============================================================================

class TestEventLinks:
    def _mk(self, client, work_id, title):
        return client.post(f"/api/v1/works/{work_id}/events", json={"title": title}).json()["id"]

    def test_create(self, client, work_id):
        a = self._mk(client, work_id, "A")
        b = self._mk(client, work_id, "B")
        r = client.post(
            f"/api/v1/works/{work_id}/events/{a}/links",
            json={"source_event_id": a, "target_event_id": b, "link_type": "causes"},
        )
        assert r.status_code == 201
        assert r.json()["link_type"] == "causes"

    def test_self_link_400(self, client, work_id):
        a = self._mk(client, work_id, "A")
        r = client.post(
            f"/api/v1/works/{work_id}/events/{a}/links",
            json={"source_event_id": a, "target_event_id": a},
        )
        assert r.status_code == 400

    def test_cross_work_404(self, client, work_id):
        a = self._mk(client, work_id, "A")
        other = client.post("/api/v1/works", json={"title": "o"}).json()["id"]
        b = self._mk(client, other, "B")
        r = client.post(
            f"/api/v1/works/{work_id}/events/{a}/links",
            json={"source_event_id": a, "target_event_id": b},
        )
        assert r.status_code == 404

    def test_duplicate_link_409(self, client, work_id):
        a = self._mk(client, work_id, "A")
        b = self._mk(client, work_id, "B")
        payload = {"source_event_id": a, "target_event_id": b, "link_type": "causes"}
        client.post(f"/api/v1/works/{work_id}/events/{a}/links", json=payload)
        r = client.post(f"/api/v1/works/{work_id}/events/{a}/links", json=payload)
        assert r.status_code == 409

    def test_list(self, client, work_id):
        a = self._mk(client, work_id, "A")
        b = self._mk(client, work_id, "B")
        c = self._mk(client, work_id, "C")
        client.post(f"/api/v1/works/{work_id}/events/{a}/links", json={"source_event_id": a, "target_event_id": b})
        client.post(f"/api/v1/works/{work_id}/events/{a}/links", json={"source_event_id": c, "target_event_id": a})
        links = client.get(f"/api/v1/works/{work_id}/events/{a}/links").json()
        assert len(links) == 2  # both directions involving A

    def test_delete(self, client, work_id):
        a = self._mk(client, work_id, "A")
        b = self._mk(client, work_id, "B")
        lid = client.post(
            f"/api/v1/works/{work_id}/events/{a}/links",
            json={"source_event_id": a, "target_event_id": b},
        ).json()["id"]
        r = client.delete(f"/api/v1/works/{work_id}/events/{a}/links/{lid}")
        assert r.status_code == 204