"""AI client wrapping OpenAI-compatible HTTP API.

Reads configuration from:
1. app_settings table (runtime overrides)
2. environment / .env defaults

Settings table takes precedence over .env.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings as env_settings
from app.services.settings import (
    KEY_API_KEY,
    KEY_BASE_URL,
    KEY_MODEL,
    KEY_TEMPERATURE,
    get_setting,
)


@dataclass
class AIConfig:
    api_key: str
    base_url: str
    model: str
    temperature: float = 0.7

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)


def resolve_config(db: Optional[Session] = None) -> AIConfig:
    api_key = env_settings.openai_api_key
    base_url = env_settings.openai_base_url
    model = env_settings.openai_model
    temperature = 0.7

    if db is not None:
        v = get_setting(db, KEY_API_KEY)
        if v:
            api_key = v
        v = get_setting(db, KEY_BASE_URL)
        if v:
            base_url = v
        v = get_setting(db, KEY_MODEL)
        if v:
            model = v
        v = get_setting(db, KEY_TEMPERATURE)
        if v:
            try:
                temperature = float(v)
            except ValueError:
                pass

    return AIConfig(
        api_key=api_key or "",
        base_url=base_url,
        model=model,
        temperature=temperature,
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
) -> str:
    """One-shot chat completion. Returns the assistant text content."""
    cfg = resolve_config(db)
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