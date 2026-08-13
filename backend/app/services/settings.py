"""Runtime application settings (overrides env defaults).

Stored in the `app_settings` table. AI client reads these to know which
base_url / api_key / model to use.
"""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.app_setting import AppSetting
from app.schemas.setting import SettingOut

KEY_API_KEY = "ai.api_key"
KEY_BASE_URL = "ai.base_url"
KEY_MODEL = "ai.model"
KEY_TEMPERATURE = "ai.temperature"

# Sensitive values are not returned by GET; only their "is_set" boolean.
SECRET_KEYS = {KEY_API_KEY}


def get_setting(db: Session, key: str, default: str | None = None) -> str | None:
    row = db.get(AppSetting, key)
    if row is None:
        return default
    return row.value


def set_setting(db: Session, key: str, value: Any) -> AppSetting:
    """Upsert a setting. `value` will be JSON-encoded when not a string."""
    encoded = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    row = db.get(AppSetting, key)
    if row is None:
        row = AppSetting(key=key, value=encoded)
        db.add(row)
    else:
        row.value = encoded
    db.commit()
    db.refresh(row)
    return row


def delete_setting(db: Session, key: str) -> bool:
    row = db.get(AppSetting, key)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def list_settings(db: Session) -> list[SettingOut]:
    """Return all settings; secret values are masked (returned as empty)."""
    rows = db.query(AppSetting).order_by(AppSetting.key).all()
    return [
        SettingOut.model_validate(
            {
                "key": r.key,
                "value": "" if r.key in SECRET_KEYS else r.value,
                "is_secret": r.key in SECRET_KEYS,
                "is_set": bool(r.value),
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
        )
        for r in rows
    ]