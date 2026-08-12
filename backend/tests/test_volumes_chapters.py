"""Tests for /api/v1/works/{wid}/volumes and /api/v1/works/{wid}/chapters."""
import pytest


@pytest.fixture()
def work_id(client):
    return client.post("/api/v1/works", json={"title": "测试作品"}).json()["id"]


# =============================================================================
# Volumes
# =============================================================================

class TestListVolumes:
    def test_empty(self, client, work_id):
        r = client.get(f"/api/v1/works/{work_id}/volumes")
        assert r.status_code == 200
        assert r.json() == []

    def test_404_work(self, client):
        r = client.get("/api/v1/works/9999/volumes")
        assert r.status_code == 404


class TestCreateVolume:
    def test_minimal(self, client, work_id):
        r = client.post(f"/api/v1/works/{work_id}/volumes", json={"title": "第一卷"})
        assert r.status_code == 201
        v = r.json()
        assert v["title"] == "第一卷"
        assert v["status"] == "planning"
        assert v["work_id"] == work_id
        assert v["order_num"] == 0

    def test_with_summary(self, client, work_id):
        r = client.post(
            f"/api/v1/works/{work_id}/volumes",
            json={"title": "V", "target_words": 50000, "order_num": 2},
        )
        assert r.json()["target_words"] == 50000
        assert r.json()["order_num"] == 2

    def test_empty_title_422(self, client, work_id):
        r = client.post(f"/api/v1/works/{work_id}/volumes", json={"title": ""})
        assert r.status_code == 422

    def test_404_work(self, client):
        r = client.post("/api/v1/works/9999/volumes", json={"title": "X"})
        assert r.status_code == 404


class TestGetVolume:
    def test_found(self, client, work_id):
        vid = client.post(f"/api/v1/works/{work_id}/volumes", json={"title": "V"}).json()["id"]
        r = client.get(f"/api/v1/works/{work_id}/volumes/{vid}")
        assert r.status_code == 200
        assert r.json()["id"] == vid

    def test_wrong_work_404(self, client, work_id):
        vid = client.post(f"/api/v1/works/{work_id}/volumes", json={"title": "V"}).json()["id"]
        other = client.post("/api/v1/works", json={"title": "other"}).json()["id"]
        r = client.get(f"/api/v1/works/{other}/volumes/{vid}")
        assert r.status_code == 404


class TestUpdateVolume:
    def test_partial(self, client, work_id):
        vid = client.post(f"/api/v1/works/{work_id}/volumes", json={"title": "V"}).json()["id"]
        r = client.put(f"/api/v1/works/{work_id}/volumes/{vid}", json={"title": "新名"})
        assert r.json()["title"] == "新名"

    def test_status_change(self, client, work_id):
        vid = client.post(f"/api/v1/works/{work_id}/volumes", json={"title": "V"}).json()["id"]
        r = client.put(f"/api/v1/works/{work_id}/volumes/{vid}", json={"status": "writing"})
        assert r.json()["status"] == "writing"


class TestDeleteVolume:
    def test_delete(self, client, work_id):
        vid = client.post(f"/api/v1/works/{work_id}/volumes", json={"title": "V"}).json()["id"]
        r = client.delete(f"/api/v1/works/{work_id}/volumes/{vid}")
        assert r.status_code == 204
        assert client.get(f"/api/v1/works/{work_id}/volumes/{vid}").status_code == 404

    def test_cascades_chapters(self, client, work_id):
        vid = client.post(f"/api/v1/works/{work_id}/volumes", json={"title": "V"}).json()["id"]
        cid = client.post(
            f"/api/v1/works/{work_id}/chapters",
            json={"work_id": work_id, "volume_id": vid, "title": "C"},
        ).json()["id"]
        client.delete(f"/api/v1/works/{work_id}/volumes/{vid}")
        # chapter should be gone due to CASCADE
        assert client.get(f"/api/v1/works/{work_id}/chapters/{cid}").status_code == 404


class TestVolumeOrdering:
    def test_default_order(self, client, work_id):
        for t in ["B", "A", "C"]:
            client.post(f"/api/v1/works/{work_id}/volumes", json={"title": t, "order_num": 0})
        # all have order_num=0, so id order wins
        r = client.get(f"/api/v1/works/{work_id}/volumes")
        assert [v["title"] for v in r.json()] == ["B", "A", "C"]

    def test_explicit_order(self, client, work_id):
        for t, o in [("B", 2), ("A", 1), ("C", 3)]:
            client.post(f"/api/v1/works/{work_id}/volumes", json={"title": t, "order_num": o})
        r = client.get(f"/api/v1/works/{work_id}/volumes")
        assert [v["title"] for v in r.json()] == ["A", "B", "C"]


# =============================================================================
# Chapters
# =============================================================================

class TestListChapters:
    def test_empty(self, client, work_id):
        r = client.get(f"/api/v1/works/{work_id}/chapters")
        assert r.status_code == 200
        assert r.json() == []

    def test_filter_by_volume(self, client, work_id):
        vid = client.post(f"/api/v1/works/{work_id}/volumes", json={"title": "V"}).json()["id"]
        client.post(
            f"/api/v1/works/{work_id}/chapters",
            json={"work_id": work_id, "volume_id": vid, "title": "inV"},
        )
        client.post(
            f"/api/v1/works/{work_id}/chapters",
            json={"work_id": work_id, "title": "noVol"},
        )
        r = client.get(f"/api/v1/works/{work_id}/chapters", params={"volume_id": vid})
        assert len(r.json()) == 1
        assert r.json()[0]["title"] == "inV"

    def test_filter_by_status(self, client, work_id):
        client.post(f"/api/v1/works/{work_id}/chapters", json={"work_id": work_id, "title": "A", "status": "planning"})
        client.post(f"/api/v1/works/{work_id}/chapters", json={"work_id": work_id, "title": "B", "status": "writing"})
        r = client.get(f"/api/v1/works/{work_id}/chapters", params={"status": "writing"})
        assert len(r.json()) == 1
        assert r.json()[0]["title"] == "B"


class TestCreateChapter:
    def test_minimal(self, client, work_id):
        r = client.post(
            f"/api/v1/works/{work_id}/chapters",
            json={"work_id": work_id, "title": "第一章"},
        )
        assert r.status_code == 201
        c = r.json()
        assert c["title"] == "第一章"
        assert c["work_id"] == work_id
        assert c["status"] == "planning"
        assert c["chapter_type"] == "plot"
        assert c["actual_words"] == 0
        assert c["volume_id"] is None

    def test_full(self, client, work_id):
        vid = client.post(f"/api/v1/works/{work_id}/volumes", json={"title": "V"}).json()["id"]
        r = client.post(
            f"/api/v1/works/{work_id}/chapters",
            json={
                "work_id": work_id,
                "volume_id": vid,
                "title": "第一章",
                "summary": "主角出发",
                "outline": "起承转合",
                "content": "正文...",
                "target_words": 3000,
                "chapter_type": "opening",
                "mood": "紧张",
                "order_num": 1,
            },
        )
        c = r.json()
        assert c["title"] == "第一章"
        assert c["outline"] == "起承转合"
        assert c["content"] == "正文..."
        assert c["chapter_type"] == "opening"

    def test_work_id_mismatch(self, client, work_id):
        r = client.post(
            f"/api/v1/works/{work_id}/chapters",
            json={"work_id": 9999, "title": "X"},
        )
        assert r.status_code == 400

    def test_volume_from_other_work_400(self, client, work_id):
        other = client.post("/api/v1/works", json={"title": "other"}).json()["id"]
        vid = client.post(f"/api/v1/works/{other}/volumes", json={"title": "V"}).json()["id"]
        r = client.post(
            f"/api/v1/works/{work_id}/chapters",
            json={"work_id": work_id, "volume_id": vid, "title": "X"},
        )
        assert r.status_code == 400

    def test_404_work(self, client):
        r = client.post("/api/v1/works/9999/chapters", json={"work_id": 9999, "title": "X"})
        assert r.status_code == 404


class TestGetChapter:
    def test_found(self, client, work_id):
        cid = client.post(
            f"/api/v1/works/{work_id}/chapters",
            json={"work_id": work_id, "title": "C"},
        ).json()["id"]
        r = client.get(f"/api/v1/works/{work_id}/chapters/{cid}")
        assert r.status_code == 200

    def test_wrong_work_404(self, client, work_id):
        cid = client.post(
            f"/api/v1/works/{work_id}/chapters",
            json={"work_id": work_id, "title": "C"},
        ).json()["id"]
        other = client.post("/api/v1/works", json={"title": "other"}).json()["id"]
        r = client.get(f"/api/v1/works/{other}/chapters/{cid}")
        assert r.status_code == 404


class TestUpdateChapter:
    def test_title_summary(self, client, work_id):
        cid = client.post(
            f"/api/v1/works/{work_id}/chapters",
            json={"work_id": work_id, "title": "C"},
        ).json()["id"]
        r = client.put(
            f"/api/v1/works/{work_id}/chapters/{cid}",
            json={"title": "新章", "summary": "新概要", "actual_words": 1234},
        )
        c = r.json()
        assert c["title"] == "新章"
        assert c["summary"] == "新概要"
        assert c["actual_words"] == 1234

    def test_move_to_volume(self, client, work_id):
        v1 = client.post(f"/api/v1/works/{work_id}/volumes", json={"title": "V1"}).json()["id"]
        v2 = client.post(f"/api/v1/works/{work_id}/volumes", json={"title": "V2"}).json()["id"]
        cid = client.post(
            f"/api/v1/works/{work_id}/chapters",
            json={"work_id": work_id, "volume_id": v1, "title": "C"},
        ).json()["id"]
        r = client.put(
            f"/api/v1/works/{work_id}/chapters/{cid}",
            json={"volume_id": v2},
        )
        assert r.json()["volume_id"] == v2

    def test_move_to_invalid_volume_400(self, client, work_id):
        other = client.post("/api/v1/works", json={"title": "other"}).json()["id"]
        v_other = client.post(f"/api/v1/works/{other}/volumes", json={"title": "V"}).json()["id"]
        cid = client.post(
            f"/api/v1/works/{work_id}/chapters",
            json={"work_id": work_id, "title": "C"},
        ).json()["id"]
        r = client.put(
            f"/api/v1/works/{work_id}/chapters/{cid}",
            json={"volume_id": v_other},
        )
        assert r.status_code == 400


class TestDeleteChapter:
    def test_delete(self, client, work_id):
        cid = client.post(
            f"/api/v1/works/{work_id}/chapters",
            json={"work_id": work_id, "title": "C"},
        ).json()["id"]
        r = client.delete(f"/api/v1/works/{work_id}/chapters/{cid}")
        assert r.status_code == 204
        assert client.get(f"/api/v1/works/{work_id}/chapters/{cid}").status_code == 404


class TestChapterOrdering:
    def test_no_volume_first(self, client, work_id):
        v = client.post(f"/api/v1/works/{work_id}/volumes", json={"title": "V"}).json()["id"]
        # insert in non-sorted order
        client.post(f"/api/v1/works/{work_id}/chapters", json={"work_id": work_id, "volume_id": v, "title": "v-B", "order_num": 2})
        client.post(f"/api/v1/works/{work_id}/chapters", json={"work_id": work_id, "volume_id": v, "title": "v-A", "order_num": 1})
        client.post(f"/api/v1/works/{work_id}/chapters", json={"work_id": work_id, "title": "free-C"})
        chapters = client.get(f"/api/v1/works/{work_id}/chapters").json()
        # free chapter (no volume) should come first
        assert chapters[0]["title"] == "free-C"
        assert chapters[1]["title"] == "v-A"
        assert chapters[2]["title"] == "v-B"