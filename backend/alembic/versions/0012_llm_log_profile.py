"""add profile_id + provider to llm_request_logs

Revision ID: 0012_llm_log_profile
Revises: 0011_ai_service_profiles
Create Date: 2026-08-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0012_llm_log_profile"
down_revision: Union[str, None] = "0011_ai_service_profiles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite cannot ALTER TABLE to add a FK constraint; copy-and-move via batch.
    with op.batch_alter_table("llm_request_logs") as batch:
        batch.add_column(
            sa.Column(
                "profile_id",
                sa.Integer(),
                nullable=True,
            )
        )
        batch.add_column(
            sa.Column("provider", sa.String(length=40), nullable=True)
        )
        batch.create_foreign_key(
            "fk_llm_request_logs_profile_id",
            "ai_service_profiles",
            ["profile_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("llm_request_logs") as batch:
        batch.drop_constraint("fk_llm_request_logs_profile_id", type_="foreignkey")
        batch.drop_column("provider")
        batch.drop_column("profile_id")