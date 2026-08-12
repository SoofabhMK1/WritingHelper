"""Tests for /api/v1/prompt-assemblies (global prompt composition library)."""


def _create_fragment(client, **overrides):
    body = {"name": "片段", "body": "片段内容"}
    body.update(overrides)
    return client.post("/api/v1/prompt-fragments", json=body).json()


def _create_assembly(client, **overrides):
    body = {"name": "组合"}
    body.update(overrides)
    return client.post("/api/v1/prompt-assemblies", json=body)


# ============================================================================
# CRUD
# ============================================================================


class TestAssemblyCrud:
    def test_empty(self, client):
        r = client.get("/api/v1/prompt-assemblies")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_minimal(self, client):
        r = _create_assembly(client)
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "组合"
        assert data["description"] is None
        assert data["system_parts"] == []
        assert data["user_parts"] == []
        assert data["sample_vars"] == {}

    def test_create_full(self, client):
        r = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "卷大纲助手",
                "description": "组合内置模板 + 我的风格片段",
                "system_parts": [
                    {"type": "text", "body": "你是大纲助手"},
                    {"type": "builtin", "prompt_name": "outline", "slot": "system"},
                ],
                "user_parts": [
                    {"type": "fragment", "fragment_id": 1},
                    {"type": "variable", "name": "title"},
                    {"type": "builtin", "prompt_name": "outline", "slot": "user_template"},
                ],
                "sample_vars": {"title": "示例作品"},
            },
        )
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "卷大纲助手"
        assert len(data["system_parts"]) == 2
        assert len(data["user_parts"]) == 3

    def test_create_empty_name_422(self, client):
        r = client.post("/api/v1/prompt-assemblies", json={"name": ""})
        assert r.status_code == 422

    def test_create_unknown_part_type_422(self, client):
        r = client.post(
            "/api/v1/prompt-assemblies",
            json={"name": "X", "user_parts": [{"type": "lol", "body": ""}]},
        )
        assert r.status_code == 422

    def test_create_fragment_part_missing_id_422(self, client):
        r = client.post(
            "/api/v1/prompt-assemblies",
            json={"name": "X", "user_parts": [{"type": "fragment"}]},
        )
        assert r.status_code == 422

    def test_create_builtin_unknown_slot_422(self, client):
        r = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "X",
                "user_parts": [
                    {"type": "builtin", "prompt_name": "outline", "slot": "weird"}
                ],
            },
        )
        assert r.status_code == 422

    def test_duplicate_names_allowed(self, client):
        a = client.post("/api/v1/prompt-assemblies", json={"name": "dup"})
        b = client.post("/api/v1/prompt-assemblies", json={"name": "dup"})
        assert a.status_code == 201
        assert b.status_code == 201
        assert a.json()["id"] != b.json()["id"]

    def test_get_one(self, client):
        aid = client.post("/api/v1/prompt-assemblies", json={"name": "A"}).json()["id"]
        r = client.get(f"/api/v1/prompt-assemblies/{aid}")
        assert r.status_code == 200
        assert r.json()["name"] == "A"

    def test_get_404(self, client):
        assert client.get("/api/v1/prompt-assemblies/9999").status_code == 404

    def test_update_partial_name(self, client):
        aid = client.post("/api/v1/prompt-assemblies", json={"name": "A"}).json()["id"]
        r = client.put(f"/api/v1/prompt-assemblies/{aid}", json={"name": "B"})
        assert r.status_code == 200
        assert r.json()["name"] == "B"

    def test_update_partial_parts(self, client):
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "A",
                "user_parts": [{"type": "text", "body": "x"}],
            },
        ).json()["id"]
        r = client.put(
            f"/api/v1/prompt-assemblies/{aid}",
            json={"user_parts": [{"type": "text", "body": "y"}]},
        )
        assert r.status_code == 200
        assert r.json()["user_parts"] == [{"type": "text", "body": "y"}]

    def test_update_404(self, client):
        r = client.put(
            "/api/v1/prompt-assemblies/9999", json={"name": "x"}
        )
        assert r.status_code == 404

    def test_delete(self, client):
        aid = client.post("/api/v1/prompt-assemblies", json={"name": "A"}).json()["id"]
        assert client.delete(f"/api/v1/prompt-assemblies/{aid}").status_code == 204
        assert client.get(f"/api/v1/prompt-assemblies/{aid}").status_code == 404

    def test_delete_404(self, client):
        assert client.delete("/api/v1/prompt-assemblies/9999").status_code == 404

    def test_search_by_name(self, client):
        client.post("/api/v1/prompt-assemblies", json={"name": "卷大纲助手"})
        client.post("/api/v1/prompt-assemblies", json={"name": "人物生成"})
        r = client.get("/api/v1/prompt-assemblies", params={"q": "卷"})
        assert r.status_code == 200
        names = [x["name"] for x in r.json()]
        assert names == ["卷大纲助手"]


# ============================================================================
# Rendering
# ============================================================================


class TestAssemblyRender:
    def test_render_empty_assembly(self, client):
        aid = client.post("/api/v1/prompt-assemblies", json={"name": "e"}).json()["id"]
        r = client.post(f"/api/v1/prompt-assemblies/{aid}/render", json={"variables": {}})
        assert r.status_code == 200
        assert r.json() == {"system": "", "user": ""}

    def test_render_text_parts_join_with_blank_line(self, client):
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "t",
                "system_parts": [{"type": "text", "body": "SYS1"}, {"type": "text", "body": "SYS2"}],
                "user_parts": [{"type": "text", "body": "USER1"}],
            },
        ).json()["id"]
        r = client.post(f"/api/v1/prompt-assemblies/{aid}/render", json={"variables": {}})
        body = r.json()
        assert body["system"] == "SYS1\n\nSYS2"
        assert body["user"] == "USER1"

    def test_render_variable_part(self, client):
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "v",
                "user_parts": [
                    {"type": "variable", "name": "title"},
                    {"type": "text", "body": " / "},
                    {"type": "variable", "name": "author"},
                ],
            },
        ).json()["id"]
        r = client.post(
            f"/api/v1/prompt-assemblies/{aid}/render",
            json={"variables": {"title": "青云志", "author": "张三"}},
        )
        assert r.json()["user"] == "青云志\n\n / \n\n张三"

    def test_render_missing_variable_uses_empty(self, client):
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "v",
                "user_parts": [
                    {"type": "variable", "name": "title"},
                    {"type": "text", "body": "/"},
                    {"type": "variable", "name": "missing"},
                ],
            },
        ).json()["id"]
        r = client.post(
            f"/api/v1/prompt-assemblies/{aid}/render",
            json={"variables": {"title": "X"}},
        )
        assert r.json()["user"] == "X\n\n/\n\n"

    def test_render_none_value_coerced_to_empty(self, client):
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "v",
                "user_parts": [{"type": "variable", "name": "title"}],
            },
        ).json()["id"]
        r = client.post(
            f"/api/v1/prompt-assemblies/{aid}/render",
            json={"variables": {"title": None}},
        )
        assert r.json()["user"] == ""

    def test_render_text_supports_variable_interpolation(self, client):
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "v",
                "user_parts": [{"type": "text", "body": "标题:{title},作者:{author}"}],
            },
        ).json()["id"]
        r = client.post(
            f"/api/v1/prompt-assemblies/{aid}/render",
            json={"variables": {"title": "X", "author": "Y"}},
        )
        assert r.json()["user"] == "标题:X,作者:Y"

    def test_render_text_missing_var_becomes_empty(self, client):
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "v",
                "user_parts": [{"type": "text", "body": "标题:{title}/{missing}"}],
            },
        ).json()["id"]
        r = client.post(
            f"/api/v1/prompt-assemblies/{aid}/render",
            json={"variables": {"title": "X"}},
        )
        assert r.json()["user"] == "标题:X/"

    def test_render_fragment_part(self, client):
        frag = _create_fragment(client, name="风格指南", body="冷硬克制")
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "f",
                "user_parts": [
                    {"type": "text", "body": "[风格]"},
                    {"type": "fragment", "fragment_id": frag["id"]},
                ],
            },
        ).json()["id"]
        r = client.post(f"/api/v1/prompt-assemblies/{aid}/render", json={"variables": {}})
        assert r.json()["user"] == "[风格]\n\n冷硬克制"

    def test_render_fragment_part_supports_interpolation(self, client):
        frag = _create_fragment(client, name="preamble", body="你好 {who}")
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "f",
                "user_parts": [{"type": "fragment", "fragment_id": frag["id"]}],
            },
        ).json()["id"]
        r = client.post(
            f"/api/v1/prompt-assemblies/{aid}/render",
            json={"variables": {"who": "世界"}},
        )
        assert r.json()["user"] == "你好 世界"

    def test_render_fragment_part_missing_422(self, client):
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "f",
                "user_parts": [{"type": "fragment", "fragment_id": 9999}],
            },
        ).json()["id"]
        r = client.post(f"/api/v1/prompt-assemblies/{aid}/render", json={"variables": {}})
        assert r.status_code == 422
        body = r.json()["detail"]
        assert body["code"] == "missing_fragment"
        assert "9999" in body["message"]

    def test_render_builtin_user_template_part(self, client):
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "b",
                "user_parts": [
                    {"type": "builtin", "prompt_name": "outline", "slot": "user_template"}
                ],
            },
        ).json()["id"]
        r = client.post(
            f"/api/v1/prompt-assemblies/{aid}/render",
            json={"variables": {"title": "天蚕土豆风", "volume_count": "3"}},
        )
        body = r.json()
        # Variables in the builtin template should be substituted
        assert "天蚕土豆风" in body["user"]
        assert "3 卷" in body["user"]

    def test_render_builtin_system_part(self, client):
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "b",
                "system_parts": [
                    {"type": "builtin", "prompt_name": "chat", "slot": "system"}
                ],
            },
        ).json()["id"]
        r = client.post(f"/api/v1/prompt-assemblies/{aid}/render", json={"variables": {}})
        assert "创作助手" in r.json()["system"]

    def test_render_builtin_unknown_name_422(self, client):
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "b",
                "user_parts": [{"type": "builtin", "prompt_name": "no_such_prompt"}],
            },
        ).json()["id"]
        r = client.post(f"/api/v1/prompt-assemblies/{aid}/render", json={"variables": {}})
        assert r.status_code == 422
        body = r.json()["detail"]
        assert body["code"] == "missing_builtin"
        assert "no_such_prompt" in body["message"]

    def test_render_builtin_missing_variable_becomes_empty(self, client):
        """Soft fallback: missing variables resolve to empty string in builtin slots too."""
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "b",
                "user_parts": [
                    {"type": "builtin", "prompt_name": "outline", "slot": "user_template"}
                ],
            },
        ).json()["id"]
        r = client.post(f"/api/v1/prompt-assemblies/{aid}/render", json={"variables": {}})
        assert r.status_code == 200
        body = r.json()["user"]
        assert "标题:" in body  # the literal prefix from OUTLINE_USER

    def test_render_404(self, client):
        r = client.post(
            "/api/v1/prompt-assemblies/9999/render", json={"variables": {}}
        )
        assert r.status_code == 404

    def test_render_mixed_parts_order_preserved(self, client):
        frag = _create_fragment(client, name="preamble", body="[PREAMBLE]")
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "mix",
                "system_parts": [
                    {"type": "text", "body": "SYS-START"},
                    {"type": "fragment", "fragment_id": frag["id"]},
                ],
                "user_parts": [
                    {"type": "variable", "name": "title"},
                    {"type": "text", "body": " / "},
                    {"type": "variable", "name": "genre"},
                ],
            },
        ).json()["id"]
        r = client.post(
            f"/api/v1/prompt-assemblies/{aid}/render",
            json={"variables": {"title": "X", "genre": "玄幻"}},
        )
        body = r.json()
        assert body["system"] == "SYS-START\n\n[PREAMBLE]"
        assert body["user"] == "X\n\n / \n\n玄幻"

    def test_render_batches_fragment_lookups(self, client, monkeypatch):
        """A single render call should batch fragment lookups, not hit the DB per part."""
        from app.services import prompt_assembly as svc

        f1 = _create_fragment(client, name="a", body="A")
        f2 = _create_fragment(client, name="b", body="B")
        f3 = _create_fragment(client, name="c", body="C")
        aid = client.post(
            "/api/v1/prompt-assemblies",
            json={
                "name": "batch",
                "user_parts": [
                    {"type": "fragment", "fragment_id": f1["id"]},
                    {"type": "fragment", "fragment_id": f2["id"]},
                    {"type": "fragment", "fragment_id": f3["id"]},
                ],
            },
        ).json()["id"]

        calls = []
        original = svc.fragment_service.get_fragments_by_ids

        def spy(db, ids):
            calls.append(list(ids))
            return original(db, ids)

        monkeypatch.setattr(
            svc.fragment_service, "get_fragments_by_ids", spy
        )
        r = client.post(
            f"/api/v1/prompt-assemblies/{aid}/render", json={"variables": {}}
        )
        assert r.status_code == 200
        assert r.json()["user"] == "A\n\nB\n\nC"
        assert len(calls) == 1
        assert sorted(calls[0]) == [f1["id"], f2["id"], f3["id"]]