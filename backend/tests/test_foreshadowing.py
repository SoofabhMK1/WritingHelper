"""Tests for /api/v1/works/{wid}/foreshadowing."""
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


class TestForeshadowing:
    def test_empty(self, client, work_id):
        r = client.get(f"/api/v1/works/{work_id}/foreshadowing")
        assert r.status_code == 200
        assert r.json() == []

    def test_404_work(self, client):
        r = client.get("/api/v1/works/9999/foreshadowing")
        assert r.status_code == 404

    def test_create(self, client, work_id, chapter_id):
        r = client.post(
            f"/api/v1/works/{work_id}/foreshadowing",
            json={
                "title": "师父的玉佩",
                "description": "暗示师父身份",
                "quote": "师父摸了摸腰间的玉佩",
                "planted_chapter_id": chapter_id,
                "status": "open",
            },
        )
        assert r.status_code == 201
        fs = r.json()
        assert fs["title"] == "师父的玉佩"
        assert fs["status"] == "open"

    def test_create_with_invalid_chapter_400(self, client, work_id):
        other = client.post("/api/v1/works", json={"title": "o"}).json()["id"]
        cid = client.post(f"/api/v1/works/{other}/chapters", json={"work_id": other, "title": "C"}).json()["id"]
        r = client.post(
            f"/api/v1/works/{work_id}/foreshadowing",
            json={"title": "X", "chapter_id": cid},
        )
        assert r.status_code == 400

    def test_get(self, client, work_id):
        fsid = client.post(
            f"/api/v1/works/{work_id}/foreshadowing", json={"title": "X"}
        ).json()["id"]
        r = client.get(f"/api/v1/works/{work_id}/foreshadowing/{fsid}")
        assert r.status_code == 200

    def test_wrong_work_404(self, client, work_id):
        fsid = client.post(
            f"/api/v1/works/{work_id}/foreshadowing", json={"title": "X"}
        ).json()["id"]
        other = client.post("/api/v1/works", json={"title": "o"}).json()["id"]
        r = client.get(f"/api/v1/works/{other}/foreshadowing/{fsid}")
        assert r.status_code == 404

    def test_update_status(self, client, work_id):
        fsid = client.post(
            f"/api/v1/works/{work_id}/foreshadowing", json={"title": "X"}
        ).json()["id"]
        r = client.put(
            f"/api/v1/works/{work_id}/foreshadowing/{fsid}",
            json={"status": "resolved"},
        )
        assert r.json()["status"] == "resolved"

    def test_delete(self, client, work_id):
        fsid = client.post(
            f"/api/v1/works/{work_id}/foreshadowing", json={"title": "X"}
        ).json()["id"]
        r = client.delete(f"/api/v1/works/{work_id}/foreshadowing/{fsid}")
        assert r.status_code == 204

    def test_filter_by_status(self, client, work_id):
        client.post(f"/api/v1/works/{work_id}/foreshadowing", json={"title": "A", "status": "open"})
        client.post(f"/api/v1/works/{work_id}/foreshadowing", json={"title": "B", "status": "resolved"})
        r = client.get(f"/api/v1/works/{work_id}/foreshadowing", params={"status": "open"})
        assert len(r.json()) == 1

    def test_filter_by_chapter(self, client, work_id, chapter_id):
        client.post(
            f"/api/v1/works/{work_id}/foreshadowing",
            json={"title": "A", "planted_chapter_id": chapter_id},
        )
        client.post(f"/api/v1/works/{work_id}/foreshadowing", json={"title": "B"})
        r = client.get(
            f"/api/v1/works/{work_id}/foreshadowing", params={"chapter_id": chapter_id}
        )
        assert len(r.json()) == 1

    def test_delete_chapter_cascades_foreshadowing(self, client, work_id, chapter_id):
        fsid = client.post(
            f"/api/v1/works/{work_id}/foreshadowing",
            json={"title": "X", "chapter_id": chapter_id},
        ).json()["id"]
        client.delete(f"/api/v1/works/{work_id}/chapters/{chapter_id}")
        assert client.get(f"/api/v1/works/{work_id}/foreshadowing/{fsid}").status_code == 404