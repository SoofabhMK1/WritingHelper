"""prompt assemblies

Revision ID: 0009_prompt_assemblies
Revises: 0008_prompt_fragments
Create Date: 2026-08-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_prompt_assemblies"
down_revision: Union[str, None] = "0008_prompt_fragments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "prompt_assemblies",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("system_parts_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("user_parts_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("sample_vars_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("prompt_assemblies")