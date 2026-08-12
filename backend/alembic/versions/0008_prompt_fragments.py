"""prompt fragments

Revision ID: 0008_prompt_fragments
Revises: 0007_foreshadowing
Create Date: 2026-08-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_prompt_fragments"
down_revision: Union[str, None] = "0007_foreshadowing"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "prompt_fragments",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("tags_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_prompt_fragments_name", "prompt_fragments", ["name"])


def downgrade() -> None:
    op.drop_index("ix_prompt_fragments_name", table_name="prompt_fragments")
    op.drop_table("prompt_fragments")