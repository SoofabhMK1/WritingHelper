"""Tests for AI service profile CRUD + per-prompt assignments + legacy
migration + integration with the AI routes (verified via mocked LLM)."""
from unittest.mock import patch

import pytest

from app.services.ai_profiles import (
    LEGACY_DEFAULT_NAME,
    list_profiles,
    list_assignments,
    resolve_profile,
)
from app.services.settings import (
    KEY_API_KEY,
    KEY_BASE_URL,
    KEY_MODEL,
    KEY_TEMPERATURE,
    set_setting,
)


# =============================================================================
# CRUD
# =============================================================================


class TestProfiles:
    def test_list_empty(self, client):
        r = client.get("/api/v1/ai/profiles")
        assert r.status_code == 200
        assert r.json() == []

    def test_create(self, client):
        r = client.post(
            "/api/v1/ai/profiles",
            json={
                "name": "OpenAI",
                "provider": "openai",
                "base_url": "https://api.openai.com/v1",
                "model": "gpt-4o-mini",
                "temperature": 0.7,
                "api_key": "sk-test",
            },
        )
        assert r.status_code == 201
        body = r.json()
        assert body["name"] == "OpenAI"
        assert body["is_default"] is False
        assert body["has_api_key"] is True
        assert "api_key" not in body  # never echoed
        assert "value" not in body

    def test_create_default(self, client):
        r = client.post(
            "/api/v1/ai/profiles",
            json={
                "name": "Default",
                "provider": "openai",
                "base_url": "https://api.openai.com/v1",
                "model": "gpt-4o-mini",
                "api_key": "sk-1",
                "is_default": True,
            },
        )
        assert r.status_code == 201
        assert r.json()["is_default"] is True

    def test_duplicate_name_400(self, client):
        client.post(
            "/api/v1/ai/profiles",
            json={
                "name": "dup",
                "provider": "openai",
                "base_url": "https://api.openai.com/v1",
                "model": "x",
                "api_key": "k",
            },
        )
        r = client.post(
            "/api/v1/ai/profiles",
            json={
                "name": "dup",
                "provider": "openai",
                "base_url": "https://api.openai.com/v1",
                "model": "y",
                "api_key": "k",
            },
        )
        assert r.status_code == 400

    def test_get_404(self, client):
        r = client.get("/api/v1/ai/profiles/9999")
        assert r.status_code == 404

    def test_update(self, client):
        pid = client.post(
            "/api/v1/ai/profiles",
            json={
                "name": "n",
                "provider": "openai",
                "base_url": "https://api.openai.com/v1",
                "model": "gpt-4o-mini",
                "api_key": "k1",
            },
        ).json()["id"]
        r = client.put(
            f"/api/v1/ai/profiles/{pid}",
            json={"model": "gpt-4o", "api_key": "k2"},
        )
        assert r.status_code == 200
        assert r.json()["model"] == "gpt-4o"
        assert r.json()["has_api_key"] is True

    def test_update_clear_api_key(self, client):
        pid = client.post(
            "/api/v1/ai/profiles",
            json={
                "name": "n",
                "provider": "openai",
                "base_url": "https://api.openai.com/v1",
                "model": "x",
                "api_key": "k1",
            },
        ).json()["id"]
        r = client.put(f"/api/v1/ai/profiles/{pid}", json={"api_key": ""})
        assert r.status_code == 200
        assert r.json()["has_api_key"] is False

    def test_delete(self, client):
        pid = client.post(
            "/api/v1/ai/profiles",
            json={
                "name": "n",
                "provider": "openai",
                "base_url": "https://api.openai.com/v1",
                "model": "x",
                "api_key": "k",
            },
        ).json()["id"]
        r = client.delete(f"/api/v1/ai/profiles/{pid}")
        assert r.status_code == 204
        assert client.get(f"/api/v1/ai/profiles/{pid}").status_code == 404

    def test_delete_404(self, client):
        r = client.delete("/api/v1/ai/profiles/9999")
        assert r.status_code == 404


# =============================================================================
# Default profile
# =============================================================================


class TestDefaultProfile:
    def _create(self, client, name, **extra):
        body = {
            "name": name,
            "provider": "openai",
            "base_url": "https://api.openai.com/v1",
            "model": "x",
            "api_key": "k",
        }
        body.update(extra)
        return client.post("/api/v1/ai/profiles", json=body).json()

    def test_only_one_default_at_a_time(self, client):
        a = self._create(client, "a", is_default=True)
        b = self._create(client, "b", is_default=True)
        ra = client.get(f"/api/v1/ai/profiles/{a['id']}").json()
        rb = client.get(f"/api/v1/ai/profiles/{b['id']}").json()
        assert ra["is_default"] is False
        assert rb["is_default"] is True

    def test_switch_default(self, client):
        a = self._create(client, "a", is_default=True)
        b = self._create(client, "b")
        r = client.put(f"/api/v1/ai/profiles/{b['id']}/default")
        assert r.status_code == 200
        assert r.json()["is_default"] is True
        ra = client.get(f"/api/v1/ai/profiles/{a['id']}").json()
        assert ra["is_default"] is False

    def test_delete_default_promotes_next(self, client):
        a = self._create(client, "a", is_default=True)
        b = self._create(client, "b")
        client.delete(f"/api/v1/ai/profiles/{a['id']}")
        rb = client.get(f"/api/v1/ai/profiles/{b['id']}").json()
        assert rb["is_default"] is True


# =============================================================================
# Assignments
# =============================================================================


class TestAssignments:
    def _profile(self, client, name):
        return client.post(
            "/api/v1/ai/profiles",
            json={
                "name": name,
                "provider": "openai",
                "base_url": "https://api.openai.com/v1",
                "model": "x",
                "api_key": "k",
            },
        ).json()

    def test_list_empty(self, client):
        r = client.get("/api/v1/ai/prompt-assignments")
        assert r.status_code == 200
        assert r.json() == {"assignments": {}}

    def test_set_then_list(self, client):
        p = self._profile(client, "p")
        r = client.put(
            f"/api/v1/ai/prompt-assignments/continue",
            json={"profile_id": p["id"]},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["assignments"]["continue"] == p["id"]

    def test_unknown_prompt_404(self, client):
        r = client.put(
            "/api/v1/ai/prompt-assignments/nonexistent",
            json={"profile_id": None},
        )
        assert r.status_code == 404

    def test_unknown_profile_400(self, client):
        r = client.put(
            "/api/v1/ai/prompt-assignments/continue",
            json={"profile_id": 9999},
        )
        assert r.status_code == 400

    def test_clear_assignment(self, client):
        p = self._profile(client, "p")
        client.put(
            "/api/v1/ai/prompt-assignments/continue",
            json={"profile_id": p["id"]},
        )
        r = client.delete("/api/v1/ai/prompt-assignments/continue")
        assert r.status_code == 204
        body = client.get("/api/v1/ai/prompt-assignments").json()
        assert "continue" not in body["assignments"]


# =============================================================================
# Legacy migration
# =============================================================================


class TestLegacyMigration:
    def test_legacy_keys_lift_into_default_profile(self, client, db_session):
        """Existing ``app_settings`` ai.* keys must be migrated into a
        default profile on first read; legacy rows are then deleted."""
        set_setting(db_session, KEY_API_KEY, "sk-legacy")
        set_setting(db_session, KEY_BASE_URL, "https://api.deepseek.com/v1")
        set_setting(db_session, KEY_MODEL, "deepseek-chat")
        set_setting(db_session, KEY_TEMPERATURE, "0.5")
        db_session.commit()

        # touch the status endpoint to trigger lazy migration
        r = client.get("/api/v1/ai/status")
        assert r.status_code == 200
        body = r.json()
        assert body["configured"] is True
        assert body["default_profile_id"] is not None
        assert body["model"] == "deepseek-chat"
        assert body["base_url"] == "https://api.deepseek.com/v1"

        # legacy rows gone
        from app.services.settings import list_settings

        legacy_keys = {row["key"] for row in list_settings(db_session)}
        assert KEY_API_KEY not in legacy_keys
        assert KEY_BASE_URL not in legacy_keys
        assert KEY_MODEL not in legacy_keys
        assert KEY_TEMPERATURE not in legacy_keys

        # profile named "迁移自旧配置" exists and is default
        assert body["default_profile_name"] == LEGACY_DEFAULT_NAME
        profile = resolve_profile(db_session)
        assert profile is not None
        assert profile.is_default is True
        assert profile.api_key == "sk-legacy"
        assert profile.model == "deepseek-chat"

    def test_legacy_migration_does_not_run_when_profiles_exist(
        self, client, db_session
    ):
        # user already saved one profile
        client.post(
            "/api/v1/ai/profiles",
            json={
                "name": "user",
                "provider": "openai",
                "base_url": "https://api.openai.com/v1",
                "model": "gpt-4o-mini",
                "api_key": "sk-user",
                "is_default": True,
            },
        )
        set_setting(db_session, KEY_API_KEY, "sk-legacy")
        db_session.commit()

        r = client.get("/api/v1/ai/status")
        body = r.json()
        # legacy key stays — migration only runs when profiles table is empty
        assert body["default_profile_name"] == "user"


# =============================================================================
# Resolution order + integration with AI routes
# =============================================================================


MOCK_VOLUMES_JSON = '{"volumes":[{"title":"第一卷","summary":"x","target_words":300000}]}'


@pytest.fixture()
def work_id(client):
    return client.post("/api/v1/works", json={"title": "测试", "genre": "玄幻"}).json()["id"]


class TestResolution:
    def _profile(self, client, name, model="x", api_key="k"):
        return client.post(
            "/api/v1/ai/profiles",
            json={
                "name": name,
                "provider": "openai",
                "base_url": "https://api.openai.com/v1",
                "model": model,
                "api_key": api_key,
                "is_default": True,
            },
        ).json()

    @patch("app.ai.client.chat")
    def test_uses_default_profile_when_no_assignment(
        self, mock_chat, client, work_id
    ):
        self._profile(client, "default", model="default-model", api_key="sk-d")
        mock_chat.return_value = MOCK_VOLUMES_JSON
        r = client.post(
            "/api/v1/ai/suggest/outline",
            json={"work_id": work_id, "volume_count": 2},
        )
        assert r.status_code == 200
        # chat() is invoked exactly once → default profile was used
        assert mock_chat.call_count == 1

    @patch("app.ai.client.chat")
    def test_assignment_overrides_default(
        self, mock_chat, client, work_id, db_session
    ):
        self._profile(client, "default", model="default-model")
        assigned = self._profile(client, "assigned", model="assigned-model")
        client.put(
            "/api/v1/ai/prompt-assignments/outline",
            json={"profile_id": assigned["id"]},
        )

        from app.services.ai_profiles import resolve_profile

        chosen = resolve_profile(db_session, "outline")
        assert chosen.id == assigned["id"]

        mock_chat.return_value = MOCK_VOLUMES_JSON
        r = client.post(
            "/api/v1/ai/suggest/outline",
            json={"work_id": work_id, "volume_count": 2},
        )
        assert r.status_code == 200

    @patch("app.ai.client.chat")
    def test_log_records_profile_id_and_provider(
        self, mock_chat, client, work_id, db_session
    ):
        from app.services.llm_log import list_logs

        profile = self._profile(client, "p", model="my-model")
        mock_chat.return_value = MOCK_VOLUMES_JSON
        r = client.post(
            "/api/v1/ai/suggest/outline",
            json={"work_id": work_id, "volume_count": 2},
        )
        assert r.status_code == 200

        rows, _ = list_logs(db_session, prompt_name="outline")
        assert len(rows) == 1
        row = rows[0]
        assert row.profile_id == profile["id"]
        assert row.provider == "openai"
        assert row.model == "my-model"


# =============================================================================
# /ai/status shape
# =============================================================================


class TestAIStatusShape:
    def test_status_includes_profiles_and_assignments(self, client):
        r = client.get("/api/v1/ai/status")
        body = r.json()
        for key in (
            "configured",
            "base_url",
            "model",
            "temperature",
            "provider",
            "default_profile_id",
            "default_profile_name",
            "profiles",
            "assignments",
        ):
            assert key in body
        assert isinstance(body["profiles"], list)
        assert isinstance(body["assignments"], dict)