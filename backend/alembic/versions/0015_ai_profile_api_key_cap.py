"""tighten ai_service_profiles.api_key from Text to String(200)

Revision ID: 0015_ai_profile_api_key_cap
Revises: 0014_drop_event_link_created_at
Create Date: 2026-08-13
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0015_ai_profile_api_key_cap"
down_revision: Union[str, None] = "0014_drop_event_link_created_at"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Refuse the migration if any stored key is too long — better to fail loudly
    # than to silently truncate user secrets.
    bind = op.get_bind()
    longest = bind.execute(
        sa.text(
            "SELECT COALESCE(MAX(LENGTH(api_key)), 0) FROM ai_service_profiles"
        )
    ).scalar() or 0
    if longest > 200:
        raise RuntimeError(
            f"Refusing to tighten api_key column: longest stored value is {longest} chars (>200). "
            "Trim or remove affected rows before running this migration."
        )

    with op.batch_alter_table("ai_service_profiles") as batch:
        batch.alter_column(
            "api_key",
            existing_type=sa.Text(),
            type_=sa.String(length=200),
            existing_nullable=False,
            existing_server_default="",
        )


def downgrade() -> None:
    with op.batch_alter_table("ai_service_profiles") as batch:
        batch.alter_column(
            "api_key",
            existing_type=sa.String(length=200),
            type_=sa.Text(),
            existing_nullable=False,
            existing_server_default="",
        )