"""Tests for /api/v1/works/{wid}/states."""
import pytest


@pytest.fixture()
def work_id(client):
    return client.post("/api/v1/works", json={"title": "测试"}).json()["id"]


@pytest.fixture()
def char_id(client, work_id):
    return client.post(
        f"/api/v1/works/{work_id}/characters",
        json={"name": "林惊羽", "role": "protagonist"},
    ).json()["id"]


@pytest.fixture()
def chapter_id(client, work_id):
    return client.post(
        f"/api/v1/works/{work_id}/chapters",
        json={"work_id": work_id, "title": "第一章"},
    ).json()["id"]


class TestListStates:
    def test_empty(self, client, work_id):
        r = client.get(f"/api/v1/works/{work_id}/states")
        assert r.status_code == 200
        assert r.json() == []

    def test_404_work(self, client):
        r = client.get("/api/v1/works/9999/states")
        assert r.status_code == 404

    def test_filter_by_character(self, client, work_id, char_id):
        other = client.post(f"/api/v1/works/{work_id}/characters", json={"name": "B"}).json()["id"]
        client.post(f"/api/v1/works/{work_id}/states", json={"character_id": char_id, "state_key": "修为", "state_value": "筑基"})
        client.post(f"/api/v1/works/{work_id}/states", json={"character_id": other, "state_key": "修为", "state_value": "金丹"})
        r = client.get(f"/api/v1/works/{work_id}/states", params={"character_id": char_id})
        assert len(r.json()) == 1
        assert r.json()[0]["character_id"] == char_id

    def test_filter_by_chapter(self, client, work_id, char_id, chapter_id):
        client.post(f"/api/v1/works/{work_id}/states", json={"character_id": char_id, "state_key": "修为", "state_value": "筑基", "chapter_id": chapter_id})
        client.post(f"/api/v1/works/{work_id}/states", json={"character_id": char_id, "state_key": "位置", "state_value": "青云山"})
        r = client.get(f"/api/v1/works/{work_id}/states", params={"chapter_id": chapter_id})
        assert len(r.json()) == 1
        assert r.json()[0]["state_key"] == "修为"

    def test_filter_by_type_and_key(self, client, work_id, char_id):
        client.post(f"/api/v1/works/{work_id}/states", json={"character_id": char_id, "state_type": "cultivation", "state_key": "修为", "state_value": "筑基"})
        client.post(f"/api/v1/works/{work_id}/states", json={"character_id": char_id, "state_type": "location", "state_key": "位置", "state_value": "青云山"})
        r = client.get(f"/api/v1/works/{work_id}/states", params={"state_type": "cultivation"})
        assert len(r.json()) == 1
        r = client.get(f"/api/v1/works/{work_id}/states", params={"state_key": "位置"})
        assert len(r.json()) == 1


class TestCreateState:
    def test_minimal(self, client, work_id, char_id):
        r = client.post(
            f"/api/v1/works/{work_id}/states",
            json={"character_id": char_id, "state_key": "修为", "state_value": "筑基"},
        )
        assert r.status_code == 201
        s = r.json()
        assert s["state_key"] == "修为"
        assert s["state_value"] == "筑基"
        assert s["state_type"] == "status"
        assert s["work_id"] == work_id

    def test_full(self, client, work_id, char_id, chapter_id):
        r = client.post(
            f"/api/v1/works/{work_id}/states",
            json={
                "character_id": char_id,
                "chapter_id": chapter_id,
                "state_type": "cultivation",
                "state_key": "修为",
                "state_value": "金丹",
                "note": "突破",
                "captured_at": "Day 90",
            },
        )
        s = r.json()
        assert s["state_type"] == "cultivation"
        assert s["chapter_id"] == chapter_id
        assert s["note"] == "突破"
        assert s["captured_at"] == "Day 90"

    def test_empty_key_422(self, client, work_id, char_id):
        r = client.post(
            f"/api/v1/works/{work_id}/states",
            json={"character_id": char_id, "state_key": "", "state_value": "x"},
        )
        assert r.status_code == 422

    def test_empty_value_422(self, client, work_id, char_id):
        r = client.post(
            f"/api/v1/works/{work_id}/states",
            json={"character_id": char_id, "state_key": "k", "state_value": ""},
        )
        assert r.status_code == 422

    def test_character_from_other_work_400(self, client, work_id):
        other = client.post("/api/v1/works", json={"title": "o"}).json()["id"]
        cid = client.post(f"/api/v1/works/{other}/characters", json={"name": "X"}).json()["id"]
        r = client.post(
            f"/api/v1/works/{work_id}/states",
            json={"character_id": cid, "state_key": "k", "state_value": "v"},
        )
        assert r.status_code == 400

    def test_chapter_from_other_work_400(self, client, work_id, char_id):
        other = client.post("/api/v1/works", json={"title": "o"}).json()["id"]
        cid = client.post(f"/api/v1/works/{other}/chapters", json={"work_id": other, "title": "C"}).json()["id"]
        r = client.post(
            f"/api/v1/works/{work_id}/states",
            json={"character_id": char_id, "chapter_id": cid, "state_key": "k", "state_value": "v"},
        )
        assert r.status_code == 400


class TestGetState:
    def test_found(self, client, work_id, char_id):
        sid = client.post(
            f"/api/v1/works/{work_id}/states",
            json={"character_id": char_id, "state_key": "k", "state_value": "v"},
        ).json()["id"]
        r = client.get(f"/api/v1/works/{work_id}/states/{sid}")
        assert r.status_code == 200

    def test_wrong_work_404(self, client, work_id, char_id):
        sid = client.post(
            f"/api/v1/works/{work_id}/states",
            json={"character_id": char_id, "state_key": "k", "state_value": "v"},
        ).json()["id"]
        other = client.post("/api/v1/works", json={"title": "o"}).json()["id"]
        r = client.get(f"/api/v1/works/{other}/states/{sid}")
        assert r.status_code == 404


class TestUpdateState:
    def test_partial(self, client, work_id, char_id, chapter_id):
        sid = client.post(
            f"/api/v1/works/{work_id}/states",
            json={"character_id": char_id, "state_key": "修为", "state_value": "筑基"},
        ).json()["id"]
        r = client.put(
            f"/api/v1/works/{work_id}/states/{sid}",
            json={"state_value": "金丹", "chapter_id": chapter_id, "captured_at": "Day 90"},
        )
        s = r.json()
        assert s["state_value"] == "金丹"
        assert s["chapter_id"] == chapter_id
        assert s["captured_at"] == "Day 90"
        assert s["state_key"] == "修为"  # unchanged


class TestDeleteState:
    def test_delete(self, client, work_id, char_id):
        sid = client.post(
            f"/api/v1/works/{work_id}/states",
            json={"character_id": char_id, "state_key": "k", "state_value": "v"},
        ).json()["id"]
        r = client.delete(f"/api/v1/works/{work_id}/states/{sid}")
        assert r.status_code == 204
        assert client.get(f"/api/v1/works/{work_id}/states/{sid}").status_code == 404


class TestHistoryOrdering:
    def test_history_by_captured_at(self, client, work_id, char_id):
        client.post(
            f"/api/v1/works/{work_id}/states",
            json={"character_id": char_id, "state_key": "修为", "state_value": "筑基", "captured_at": "Day 1"},
        )
        client.post(
            f"/api/v1/works/{work_id}/states",
            json={"character_id": char_id, "state_key": "修为", "state_value": "金丹", "captured_at": "Day 90"},
        )
        client.post(
            f"/api/v1/works/{work_id}/states",
            json={"character_id": char_id, "state_key": "修为", "state_value": "元婴", "captured_at": None},
        )
        r = client.get(f"/api/v1/works/{work_id}/states", params={"state_key": "修为"}).json()
        values = [s["state_value"] for s in r]
        assert values == ["筑基", "金丹", "元婴"]  # null last


class TestCascade:
    def test_delete_character_removes_states(self, client, work_id, char_id):
        sid = client.post(
            f"/api/v1/works/{work_id}/states",
            json={"character_id": char_id, "state_key": "k", "state_value": "v"},
        ).json()["id"]
        client.delete(f"/api/v1/works/{work_id}/characters/{char_id}")
        assert client.get(f"/api/v1/works/{work_id}/states/{sid}").status_code == 404

    def test_delete_chapter_keeps_states(self, client, work_id, char_id, chapter_id):
        """chapter_id SET NULL — 删章节时状态应保留(只是 chapter_id 清空)"""
        sid = client.post(
            f"/api/v1/works/{work_id}/states",
            json={"character_id": char_id, "state_key": "k", "state_value": "v", "chapter_id": chapter_id},
        ).json()["id"]
        client.delete(f"/api/v1/works/{work_id}/chapters/{chapter_id}")
        s = client.get(f"/api/v1/works/{work_id}/states/{sid}").json()
        assert s["chapter_id"] is None
        assert s["state_value"] == "v"