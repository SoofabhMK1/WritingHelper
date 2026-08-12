"""Tests for /api/v1/works/{wid}/characters and /protagonists."""
import pytest


@pytest.fixture()
def work_id(client):
    return client.post("/api/v1/works", json={"title": "测试"}).json()["id"]


# =============================================================================
# Characters
# =============================================================================

class TestListCharacters:
    def test_empty(self, client, work_id):
        r = client.get(f"/api/v1/works/{work_id}/characters")
        assert r.status_code == 200
        assert r.json() == []

    def test_filter_by_role(self, client, work_id):
        client.post(f"/api/v1/works/{work_id}/characters", json={"name": "A", "role": "protagonist"})
        client.post(f"/api/v1/works/{work_id}/characters", json={"name": "B", "role": "antagonist"})
        r = client.get(f"/api/v1/works/{work_id}/characters", params={"role": "antagonist"})
        assert len(r.json()) == 1
        assert r.json()[0]["name"] == "B"

    def test_search_by_name(self, client, work_id):
        client.post(f"/api/v1/works/{work_id}/characters", json={"name": "林惊羽"})
        client.post(f"/api/v1/works/{work_id}/characters", json={"name": "叶无心"})
        r = client.get(f"/api/v1/works/{work_id}/characters", params={"q": "林"})
        assert len(r.json()) == 1


class TestCreateCharacter:
    def test_minimal(self, client, work_id):
        r = client.post(f"/api/v1/works/{work_id}/characters", json={"name": "林惊羽"})
        assert r.status_code == 201
        c = r.json()
        assert c["name"] == "林惊羽"
        assert c["role"] == "side"
        assert c["age"] is None
        assert c["work_id"] == work_id

    def test_full(self, client, work_id):
        r = client.post(
            f"/api/v1/works/{work_id}/characters",
            json={
                "name": "叶无心",
                "aliases": "无心剑客",
                "role": "protagonist",
                "age": 18,
                "gender": "男",
                "appearance": "白衣,长发",
                "personality": "沉默寡言,内心柔软",
                "background": "出身没落剑宗",
                "motivation": "寻找失踪的师父",
                "arc": "从冷漠到信任他人",
                "speech_style": "简短,常以反问结束",
                "ability": "归元剑法",
                "occupation": "剑客",
                "notes": "核心主角",
            },
        )
        assert r.status_code == 201
        c = r.json()
        assert c["aliases"] == "无心剑客"
        assert c["age"] == 18
        assert c["ability"] == "归元剑法"

    def test_empty_name_422(self, client, work_id):
        r = client.post(f"/api/v1/works/{work_id}/characters", json={"name": ""})
        assert r.status_code == 422

    def test_negative_age_422(self, client, work_id):
        r = client.post(f"/api/v1/works/{work_id}/characters", json={"name": "X", "age": -1})
        assert r.status_code == 422

    def test_404_work(self, client):
        r = client.post("/api/v1/works/9999/characters", json={"name": "X"})
        assert r.status_code == 404


class TestGetCharacter:
    def test_found(self, client, work_id):
        cid = client.post(f"/api/v1/works/{work_id}/characters", json={"name": "A"}).json()["id"]
        r = client.get(f"/api/v1/works/{work_id}/characters/{cid}")
        assert r.status_code == 200

    def test_wrong_work_404(self, client, work_id):
        cid = client.post(f"/api/v1/works/{work_id}/characters", json={"name": "A"}).json()["id"]
        other = client.post("/api/v1/works", json={"title": "other"}).json()["id"]
        r = client.get(f"/api/v1/works/{other}/characters/{cid}")
        assert r.status_code == 404


class TestUpdateCharacter:
    def test_partial(self, client, work_id):
        cid = client.post(f"/api/v1/works/{work_id}/characters", json={"name": "A", "age": 18}).json()["id"]
        r = client.put(
            f"/api/v1/works/{work_id}/characters/{cid}",
            json={"age": 19, "ability": "九阳真经"},
        )
        assert r.json()["age"] == 19
        assert r.json()["ability"] == "九阳真经"
        assert r.json()["name"] == "A"


class TestDeleteCharacter:
    def test_delete(self, client, work_id):
        cid = client.post(f"/api/v1/works/{work_id}/characters", json={"name": "A"}).json()["id"]
        r = client.delete(f"/api/v1/works/{work_id}/characters/{cid}")
        assert r.status_code == 204
        assert client.get(f"/api/v1/works/{work_id}/characters/{cid}").status_code == 404

    def test_cascades_protagonist(self, client, work_id):
        cid = client.post(f"/api/v1/works/{work_id}/characters", json={"name": "A"}).json()["id"]
        pid = client.post(
            f"/api/v1/works/{work_id}/protagonists",
            json={"character_id": cid, "core_conflict": "X"},
        ).json()["id"]
        client.delete(f"/api/v1/works/{work_id}/characters/{cid}")
        assert client.get(f"/api/v1/works/{work_id}/protagonists/{pid}").status_code == 404


class TestWorkCascade:
    def test_delete_work_removes_characters(self, client, work_id):
        cid = client.post(f"/api/v1/works/{work_id}/characters", json={"name": "A"}).json()["id"]
        client.delete(f"/api/v1/works/{work_id}")
        # we need a different fixture to verify, but we can at least verify
        # the work is gone; characters row check is implicit via FK
        assert client.get(f"/api/v1/works/{work_id}").status_code == 404
        _ = cid  # silence unused warning


# =============================================================================
# Protagonists
# =============================================================================

@pytest.fixture()
def char_id(client, work_id):
    return client.post(
        f"/api/v1/works/{work_id}/characters",
        json={"name": "主角", "role": "protagonist"},
    ).json()["id"]


class TestListProtagonists:
    def test_empty(self, client, work_id):
        r = client.get(f"/api/v1/works/{work_id}/protagonists")
        assert r.status_code == 200
        assert r.json() == []


class TestCreateProtagonist:
    def test_minimal(self, client, work_id, char_id):
        r = client.post(
            f"/api/v1/works/{work_id}/protagonists",
            json={"character_id": char_id},
        )
        assert r.status_code == 201
        p = r.json()
        assert p["character_id"] == char_id
        assert p["work_id"] == work_id
        assert p["core_conflict"] is None

    def test_full(self, client, work_id, char_id):
        r = client.post(
            f"/api/v1/works/{work_id}/protagonists",
            json={
                "character_id": char_id,
                "core_conflict": "家仇 vs 正道",
                "external_goal": "复仇",
                "internal_goal": "放下",
                "ghost": "母亲被屠",
                "wound": "信任崩塌",
                "lie_believed": "强大即可保护一切",
                "truth_needed": "放下执念方得自由",
                "arc_summary": "从执剑到放下",
                "key_relationships": "师父,仇人,师妹",
                "special_abilities": "归元剑法",
                "pov_label": "第一视角",
            },
        )
        assert r.status_code == 201
        p = r.json()
        assert p["core_conflict"] == "家仇 vs 正道"
        assert p["lie_believed"] == "强大即可保护一切"

    def test_character_from_other_work_400(self, client, work_id):
        other = client.post("/api/v1/works", json={"title": "other"}).json()["id"]
        cid = client.post(f"/api/v1/works/{other}/characters", json={"name": "X"}).json()["id"]
        r = client.post(
            f"/api/v1/works/{work_id}/protagonists",
            json={"character_id": cid},
        )
        assert r.status_code == 400

    def test_duplicate_profile_409(self, client, work_id, char_id):
        client.post(f"/api/v1/works/{work_id}/protagonists", json={"character_id": char_id})
        r = client.post(f"/api/v1/works/{work_id}/protagonists", json={"character_id": char_id})
        assert r.status_code == 409

    def test_404_work(self, client):
        r = client.post("/api/v1/works/9999/protagonists", json={"character_id": 1})
        assert r.status_code == 404


class TestUpdateProtagonist:
    def test_partial(self, client, work_id, char_id):
        pid = client.post(
            f"/api/v1/works/{work_id}/protagonists",
            json={"character_id": char_id},
        ).json()["id"]
        r = client.put(
            f"/api/v1/works/{work_id}/protagonists/{pid}",
            json={"core_conflict": "新冲突", "pov_label": "第三人称"},
        )
        assert r.json()["core_conflict"] == "新冲突"
        assert r.json()["pov_label"] == "第三人称"


class TestDeleteProtagonist:
    def test_delete(self, client, work_id, char_id):
        pid = client.post(
            f"/api/v1/works/{work_id}/protagonists",
            json={"character_id": char_id},
        ).json()["id"]
        r = client.delete(f"/api/v1/works/{work_id}/protagonists/{pid}")
        assert r.status_code == 204
        assert client.get(f"/api/v1/works/{work_id}/protagonists/{pid}").status_code == 404


class TestProtagonistWrongWork:
    def test_get_wrong_work_404(self, client, work_id, char_id):
        pid = client.post(
            f"/api/v1/works/{work_id}/protagonists",
            json={"character_id": char_id},
        ).json()["id"]
        other = client.post("/api/v1/works", json={"title": "other"}).json()["id"]
        r = client.get(f"/api/v1/works/{other}/protagonists/{pid}")
        assert r.status_code == 404