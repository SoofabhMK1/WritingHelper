"""Tests for /api/v1/prompt-fragments (global prompt snippet library)."""


class TestPromptFragments:
    def test_empty(self, client):
        r = client.get("/api/v1/prompt-fragments")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_minimal(self, client):
        r = client.post(
            "/api/v1/prompt-fragments",
            json={"name": "风格指南", "body": "保持冷硬克制"},
        )
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "风格指南"
        assert data["body"] == "保持冷硬克制"
        assert data["description"] is None
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_full(self, client):
        r = client.post(
            "/api/v1/prompt-fragments",
            json={
                "name": "JSON 示例",
                "body": '{"items": [...]}',
                "description": "用作 few-shot 的 JSON 格式样例",
            },
        )
        assert r.status_code == 201
        data = r.json()
        assert data["description"] == "用作 few-shot 的 JSON 格式样例"

    def test_create_empty_name_422(self, client):
        r = client.post("/api/v1/prompt-fragments", json={"name": "", "body": "x"})
        assert r.status_code == 422

    def test_create_name_too_long_422(self, client):
        r = client.post(
            "/api/v1/prompt-fragments",
            json={"name": "x" * 121, "body": "x"},
        )
        assert r.status_code == 422

    def test_duplicate_names_allowed(self, client):
        """Per design choice: same name is fine — id is the stable identifier."""
        a = client.post(
            "/api/v1/prompt-fragments", json={"name": "dup", "body": "first"}
        )
        b = client.post(
            "/api/v1/prompt-fragments", json={"name": "dup", "body": "second"}
        )
        assert a.status_code == 201
        assert b.status_code == 201
        assert a.json()["id"] != b.json()["id"]
        listing = client.get("/api/v1/prompt-fragments").json()
        assert len(listing) == 2

    def test_get_one(self, client):
        fid = client.post(
            "/api/v1/prompt-fragments", json={"name": "A", "body": "a"}
        ).json()["id"]
        r = client.get(f"/api/v1/prompt-fragments/{fid}")
        assert r.status_code == 200
        assert r.json()["name"] == "A"

    def test_get_404(self, client):
        r = client.get("/api/v1/prompt-fragments/9999")
        assert r.status_code == 404

    def test_update_partial(self, client):
        fid = client.post(
            "/api/v1/prompt-fragments",
            json={"name": "A", "body": "a", "description": "d"},
        ).json()["id"]
        r = client.put(
            f"/api/v1/prompt-fragments/{fid}", json={"body": "new body"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["body"] == "new body"
        assert data["description"] == "d"
        assert data["name"] == "A"

    def test_update_404(self, client):
        r = client.put(
            "/api/v1/prompt-fragments/9999", json={"body": "x"}
        )
        assert r.status_code == 404

    def test_delete(self, client):
        fid = client.post(
            "/api/v1/prompt-fragments", json={"name": "A", "body": "a"}
        ).json()["id"]
        r = client.delete(f"/api/v1/prompt-fragments/{fid}")
        assert r.status_code == 204
        assert client.get(f"/api/v1/prompt-fragments/{fid}").status_code == 404

    def test_delete_404(self, client):
        r = client.delete("/api/v1/prompt-fragments/9999")
        assert r.status_code == 404

    def test_search_by_name(self, client):
        client.post("/api/v1/prompt-fragments", json={"name": "风格指南", "body": "x"})
        client.post("/api/v1/prompt-fragments", json={"name": "JSON 示例", "body": "x"})
        r = client.get("/api/v1/prompt-fragments", params={"q": "风格"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 1
        assert items[0]["name"] == "风格指南"

    def test_ordering_by_id(self, client):
        a = client.post("/api/v1/prompt-fragments", json={"name": "a", "body": ""}).json()["id"]
        b = client.post("/api/v1/prompt-fragments", json={"name": "b", "body": ""}).json()["id"]
        c = client.post("/api/v1/prompt-fragments", json={"name": "c", "body": ""}).json()["id"]
        listing = client.get("/api/v1/prompt-fragments").json()
        ids = [x["id"] for x in listing]
        assert ids == [a, b, c]

    def test_bulk_lookup_by_ids(self, client, db_session):
        from app.services.prompt_fragment import get_fragments_by_ids

        a = client.post("/api/v1/prompt-fragments", json={"name": "a", "body": "x"}).json()["id"]
        b = client.post("/api/v1/prompt-fragments", json={"name": "b", "body": "y"}).json()["id"]
        mapping = get_fragments_by_ids(db_session, [a, b, 9999])
        assert set(mapping.keys()) == {a, b}
        assert mapping[a].body == "x"
        assert mapping[b].body == "y"