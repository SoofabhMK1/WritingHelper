"""AI client wrapping OpenAI-compatible HTTP API.

Reads configuration from saved ``ai_service_profiles`` (multi-profile
with a default + per-prompt assignments). Falls back to env defaults
when no profile is configured.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings as env_settings
from app.services.ai_profiles import resolve_profile


@dataclass
class AIConfig:
    api_key: str
    base_url: str
    model: str
    temperature: float = 0.7
    profile_id: Optional[int] = None
    profile_name: Optional[str] = None
    provider: str = ""

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)


def resolve_config(
    db: Optional[Session] = None,
    prompt_name: Optional[str] = None,
) -> AIConfig:
    """Pick the right config for ``prompt_name``.

    Resolution order:

      1. saved profile (explicit assignment → default → legacy migration)
      2. env defaults (``openai_api_key`` / ``openai_base_url`` /
         ``openai_model``)

    Returns an ``AIConfig`` with empty ``api_key`` if nothing is set —
    callers should surface a 503 via ``get_client``.
    """
    if db is not None:
        profile = resolve_profile(db, prompt_name)
        if profile is not None:
            return AIConfig(
                api_key=profile.api_key or "",
                base_url=profile.base_url,
                model=profile.model,
                temperature=profile.temperature,
                profile_id=profile.id,
                profile_name=profile.name,
                provider=profile.provider,
            )

    return AIConfig(
        api_key=env_settings.openai_api_key or "",
        base_url=env_settings.openai_base_url or "https://api.openai.com/v1",
        model=env_settings.openai_model or "gpt-4o-mini",
        temperature=0.7,
    )


class AIServiceError(RuntimeError):
    """Raised when the AI service cannot produce a result."""

    def __init__(self, message: str, code: str = "ai_error"):
        super().__init__(message)
        self.code = code


def get_client(cfg: AIConfig):
    """Return an OpenAI-compatible client. Lazy import so tests without
    the package still pass."""
    from openai import OpenAI

    if not cfg.is_configured:
        raise AIServiceError(
            "AI 尚未配置 API Key。请前往「设置」填写。",
            code="not_configured",
        )
    return OpenAI(api_key=cfg.api_key, base_url=cfg.base_url)


def chat(
    db: Session | None,
    system: str,
    user: str,
    *,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    json_mode: bool = False,
    prompt_name: Optional[str] = None,
    cfg: Optional[AIConfig] = None,
) -> str:
    """One-shot chat completion. Returns the assistant text content.

    ``cfg`` may be passed in by callers that have already resolved the
    config (so we don't query the DB twice). When omitted, falls back to
    :func:`resolve_config` with ``prompt_name``.
    """
    if cfg is None:
        cfg = resolve_config(db, prompt_name=prompt_name)
    client = get_client(cfg)

    kwargs = {
        "model": model or cfg.model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": cfg.temperature if temperature is None else temperature,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    resp = client.chat.completions.create(**kwargs)
    msg = resp.choices[0].message
    return (msg.content or "").strip()