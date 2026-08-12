"""Tests for the AI prompt → PromptAssembly binding feature.

Covers:

* Service layer CRUD (``list/set/clear`` binding + clone built-in).
* HTTP routes under ``/api/v1/ai/prompt-template-bindings`` and
  ``/api/v1/ai/prompts/{name}/clone``.
* The ``resolve_prompt`` resolution order (binding → built-in fallback,
  including dangling FK).
* End-to-end AI route integration: when a binding is set, the call uses
  the assembly body (variables interpolated), and the LLM log captures
  ``prompt_assembly_id``.
"""
from __future__ import annotations

from unittest.mock import patch

import pytest

from app.ai.prompts import PROMPTS
from app.models.prompt_assembly import PromptAssembly
from app.services.ai_prompt_template import (
    clear_binding,
    clone_builtin_to_assembly,
    list_bindings,
    resolve_prompt,
    set_binding,
)
from app.services.prompt_assembly import AssemblyRenderError


# =============================================================================
# Service: clone_builtin_to_assembly
# =============================================================================


class TestCloneBuiltin:
    def test_clone_seeds_text_parts(self, db_session):
        row = clone_builtin_to_assembly(
            db_session,
            "outline",
            name="我的卷大纲",
            description="forked",
        )
        assert isinstance(row, PromptAssembly)
        assert row.name == "我的卷大纲"
        assert row.description == "forked"
        # single text part on each side carrying the built-in body
        assert row.system_parts_json != "[]"
        assert row.user_parts_json != "[]"
        import json

        sys_parts = json.loads(row.system_parts_json)
        usr_parts = json.loads(row.user_parts_json)
        assert sys_parts == [{"type": "text", "body": PROMPTS["outline"].system}]
        assert usr_parts == [
            {"type": "text", "body": PROMPTS["outline"].user_template}
        ]

    def test_clone_preserves_variables(self, db_session):
        row = clone_builtin_to_assembly(
            db_session, "continue", name="续写副本"
        )
        assert "{tail}" in row.user_parts_json
        assert "{work_title}" in row.user_parts_json

    def test_clone_unknown_prompt_404(self, db_session):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as ei:
            clone_builtin_to_assembly(db_session, "nope", name="x")
        assert ei.value.status_code == 404


# =============================================================================
# Service: bindings CRUD + resolve_prompt
# =============================================================================


class TestBindingCRUD:
    def test_list_empty(self, db_session):
        assert list_bindings(db_session) == {}

    def test_set_and_get(self, db_session):
        asm = clone_builtin_to_assembly(
            db_session, "outline", name="outline copy"
        )
        set_binding(db_session, "outline", asm.id)
        assert list_bindings(db_session) == {"outline": asm.id}

    def test_set_null_is_builtin(self, db_session):
        asm = clone_builtin_to_assembly(
            db_session, "outline", name="outline copy"
        )
        set_binding(db_session, "outline", asm.id)
        set_binding(db_session, "outline", None)
        assert list_bindings(db_session) == {"outline": None}

    def test_unknown_prompt_400(self, db_session):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as ei:
            set_binding(db_session, "bogus", 1)
        assert ei.value.status_code == 400

    def test_unknown_assembly_400(self, db_session):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as ei:
            set_binding(db_session, "outline", 99999)
        assert ei.value.status_code == 400

    def test_clear_binding(self, db_session):
        asm = clone_builtin_to_assembly(
            db_session, "outline", name="outline copy"
        )
        set_binding(db_session, "outline", asm.id)
        assert clear_binding(db_session, "outline") is True
        # second clear is a no-op
        assert clear_binding(db_session, "outline") is False
        assert list_bindings(db_session) == {}


class TestResolvePrompt:
    OUTLINE_VARS = {
        "title": "X",
        "genre": "g",
        "style": "s",
        "pov": "p",
        "description": "d",
        "target_words": 100000,
        "volume_count": 3,
    }

    def test_falls_back_to_builtin(self, db_session):
        # no binding → use built-in
        resolved = resolve_prompt(db_session, "outline", self.OUTLINE_VARS)
        assert resolved.assembly_id is None
        assert resolved.system == PROMPTS["outline"].system
        assert "{title}" not in resolved.user
        assert "X" in resolved.user

    def test_uses_bound_assembly(self, db_session):
        asm = clone_builtin_to_assembly(
            db_session, "outline", name="outline copy"
        )
        set_binding(db_session, "outline", asm.id)
        resolved = resolve_prompt(
            db_session,
            "outline",
            {**self.OUTLINE_VARS, "title": "Y"},
        )
        assert resolved.assembly_id == asm.id
        assert resolved.system == PROMPTS["outline"].system
        assert "Y" in resolved.user

    def test_dangling_binding_falls_back(self, db_session):
        # set binding pointing at a real assembly, then delete it
        asm = clone_builtin_to_assembly(
            db_session, "outline", name="transient"
        )
        set_binding(db_session, "outline", asm.id)
        # delete the assembly; FK ON DELETE SET NULL leaves the row
        # pointing at NULL — resolve should then fall back.
        db_session.delete(asm)
        db_session.commit()
        resolved = resolve_prompt(
            db_session,
            "outline",
            {**self.OUTLINE_VARS, "title": "Z"},
        )
        assert resolved.assembly_id is None
        assert resolved.system == PROMPTS["outline"].system

    def test_missing_variable_raises(self, db_session):
        # builtin render() raises ValueError on missing keys
        with pytest.raises(ValueError):
            resolve_prompt(db_session, "outline", {})


# =============================================================================
# HTTP routes — bindings
# =============================================================================


class TestBindingsAPI:
    def test_list_empty(self, client):
        r = client.get("/api/v1/ai/prompt-template-bindings")
        assert r.status_code == 200
        assert r.json() == {"bindings": {}}

    def test_put_then_get_then_delete(self, client):
        # create an assembly first
        asm = client.post(
            "/api/v1/ai/prompts/outline/clone",
            json={"name": "我的卷大纲", "description": "fork"},
        ).json()
        asm_id = asm["id"]

        r = client.put(
            "/api/v1/ai/prompt-template-bindings/outline",
            json={"assembly_id": asm_id},
        )
        assert r.status_code == 200
        assert r.json()["prompt_name"] == "outline"
        assert r.json()["assembly_id"] == asm_id

        r = client.get("/api/v1/ai/prompt-template-bindings")
        assert r.json() == {"bindings": {"outline": asm_id}}

        r = client.get("/api/v1/ai/prompt-template-bindings/outline")
        assert r.status_code == 200
        assert r.json()["assembly_id"] == asm_id

        r = client.put(
            "/api/v1/ai/prompt-template-bindings/outline",
            json={"assembly_id": None},
        )
        assert r.status_code == 200
        assert r.json()["assembly_id"] is None

        r = client.delete(
            "/api/v1/ai/prompt-template-bindings/outline"
        )
        assert r.status_code == 204
        r = client.get("/api/v1/ai/prompt-template-bindings")
        assert r.json() == {"bindings": {}}

    def test_put_unknown_prompt_400(self, client):
        r = client.put(
            "/api/v1/ai/prompt-template-bindings/bogus",
            json={"assembly_id": None},
        )
        assert r.status_code == 400

    def test_put_unknown_assembly_400(self, client):
        r = client.put(
            "/api/v1/ai/prompt-template-bindings/outline",
            json={"assembly_id": 99999},
        )
        assert r.status_code == 400

    def test_get_unknown_binding_404(self, client):
        r = client.get("/api/v1/ai/prompt-template-bindings/outline")
        assert r.status_code == 404

    def test_delete_unknown_binding_404(self, client):
        r = client.delete("/api/v1/ai/prompt-template-bindings/outline")
        assert r.status_code == 404


# =============================================================================
# HTTP routes — clone
# =============================================================================


class TestCloneAPI:
    def test_clone_returns_assembly(self, client):
        r = client.post(
            "/api/v1/ai/prompts/outline/clone",
            json={"name": "我的卷大纲"},
        )
        assert r.status_code == 201
        body = r.json()
        assert body["name"] == "我的卷大纲"
        assert len(body["system_parts"]) == 1
        assert body["system_parts"][0]["type"] == "text"
        assert body["system_parts"][0]["body"] == PROMPTS["outline"].system
        assert body["user_parts"][0]["body"] == PROMPTS[
            "outline"
        ].user_template

    def test_clone_unknown_prompt_404(self, client):
        r = client.post(
            "/api/v1/ai/prompts/bogus/clone",
            json={"name": "x"},
        )
        assert r.status_code == 404


# =============================================================================
# HTTP routes — built-in catalog (re-exposed under /ai/prompts-catalog)
# =============================================================================


class TestBuiltinCatalogAPI:
    def test_list(self, client):
        r = client.get("/api/v1/ai/prompts-catalog")
        assert r.status_code == 200
        names = {p["name"] for p in r.json()}
        assert names == set(PROMPTS.keys())

    def test_get(self, client):
        r = client.get("/api/v1/ai/prompts-catalog/outline")
        assert r.status_code == 200
        body = r.json()
        assert body["name"] == "outline"
        assert body["json_mode"] is True
        assert "请为这部作品设计" in body["user_template"]

    def test_get_unknown_404(self, client):
        r = client.get("/api/v1/ai/prompts-catalog/bogus")
        assert r.status_code == 404


# =============================================================================
# AI route integration: bound assembly is actually used at call time
# =============================================================================


class TestAICallUsesBinding:
    def _create_work(self, client):
        return client.post(
            "/api/v1/works",
            json={"title": "测试作品", "target_words": 100000},
        ).json()

    def test_binding_changes_prompt_body(self, client):
        work = self._create_work(client)
        # 1. configure a fake API profile (required for chat to not 503)
        client.post(
            "/api/v1/ai/profiles",
            json={
                "name": "fake",
                "provider": "openai",
                "base_url": "https://api.example.com/v1",
                "model": "m",
                "temperature": 0.7,
                "api_key": "sk-test",
                "is_default": True,
            },
        )
        # 2. clone the outline prompt and edit its user body
        asm = client.post(
            "/api/v1/ai/prompts/outline/clone",
            json={"name": "我的卷大纲"},
        ).json()
        edited_user = "CUSTOM-OUTLINE-USER: {title}/{volume_count}"
        client.put(
            f"/api/v1/prompt-assemblies/{asm['id']}",
            json={
                "name": "我的卷大纲",
                "system_parts": [
                    {"type": "text", "body": "CUSTOM-OUTLINE-SYSTEM"}
                ],
                "user_parts": [{"type": "text", "body": edited_user}],
            },
        )
        # 3. bind
        client.put(
            "/api/v1/ai/prompt-template-bindings/outline",
            json={"assembly_id": asm["id"]},
        )

        # 4. mock chat() and call the AI endpoint
        with patch("app.api.v1.ai.ai_client.chat", return_value='{"volumes":[]}') as m:
            r = client.post(
                "/api/v1/ai/suggest/outline",
                json={"work_id": work["id"], "volume_count": 4},
            )
        assert r.status_code == 200
        # Inspect what chat() actually received
        kwargs = m.call_args.kwargs
        assert kwargs["system"] == "CUSTOM-OUTLINE-SYSTEM"
        assert kwargs["user"] == "CUSTOM-OUTLINE-USER: 测试作品/4"
        assert kwargs["json_mode"] is True
        assert kwargs["prompt_name"] == "outline"

        # 5. the LLM log captures prompt_assembly_id
        logs = client.get("/api/v1/ai-logs", params={"prompt_name": "outline"}).json()
        assert logs["total"] >= 1
        assert logs["items"][0]["prompt_assembly_id"] == asm["id"]

    def test_no_binding_uses_builtin(self, client):
        work = self._create_work(client)
        client.post(
            "/api/v1/ai/profiles",
            json={
                "name": "fake",
                "provider": "openai",
                "base_url": "https://api.example.com/v1",
                "model": "m",
                "temperature": 0.7,
                "api_key": "sk-test",
                "is_default": True,
            },
        )
        with patch("app.api.v1.ai.ai_client.chat", return_value='{"volumes":[]}') as m:
            r = client.post(
                "/api/v1/ai/suggest/outline",
                json={"work_id": work["id"], "volume_count": 3},
            )
        assert r.status_code == 200
        kwargs = m.call_args.kwargs
        assert kwargs["system"] == PROMPTS["outline"].system
        assert "{title}" not in kwargs["user"]

        # log shows no assembly
        logs = client.get(
            "/api/v1/ai-logs", params={"prompt_name": "outline"}
        ).json()
        assert logs["items"][0]["prompt_assembly_id"] is None

    def test_dangling_binding_falls_back(self, client):
        """Deleting the bound assembly reverts the call to the built-in."""
        work = self._create_work(client)
        client.post(
            "/api/v1/ai/profiles",
            json={
                "name": "fake",
                "provider": "openai",
                "base_url": "https://api.example.com/v1",
                "model": "m",
                "temperature": 0.7,
                "api_key": "sk-test",
                "is_default": True,
            },
        )
        asm = client.post(
            "/api/v1/ai/prompts/outline/clone",
            json={"name": "tmp"},
        ).json()
        client.put(
            "/api/v1/ai/prompt-template-bindings/outline",
            json={"assembly_id": asm["id"]},
        )
        # delete the underlying assembly (cascades FK to NULL)
        client.delete(f"/api/v1/prompt-assemblies/{asm['id']}")

        with patch("app.api.v1.ai.ai_client.chat", return_value='{"volumes":[]}') as m:
            r = client.post(
                "/api/v1/ai/suggest/outline",
                json={"work_id": work["id"], "volume_count": 3},
            )
        assert r.status_code == 200
        kwargs = m.call_args.kwargs
        assert kwargs["system"] == PROMPTS["outline"].system
