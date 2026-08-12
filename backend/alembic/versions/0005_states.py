"""character_states

Revision ID: 0005_states
Revises: 0004_events
Create Date: 2026-08-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_states"
down_revision: Union[str, None] = "0004_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "character_states",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("work_id", sa.Integer(), nullable=False),
        sa.Column("character_id", sa.Integer(), nullable=False),
        sa.Column("chapter_id", sa.Integer(), nullable=True),
        sa.Column("state_type", sa.String(length=20), nullable=False, server_default="status"),
        sa.Column("state_key", sa.String(length=80), nullable=False),
        sa.Column("state_value", sa.String(length=500), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("captured_at", sa.String(length=40), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["work_id"], ["works.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["character_id"], ["characters.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["chapter_id"], ["chapters.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_character_states_work_id", "character_states", ["work_id"])
    op.create_index("ix_character_states_character_id", "character_states", ["character_id"])
    op.create_index("ix_character_states_chapter_id", "character_states", ["chapter_id"])
    op.create_index("ix_character_states_state_type", "character_states", ["state_type"])
    op.create_index("ix_character_states_captured_at", "character_states", ["captured_at"])
    op.create_index(
        "ix_state_lookup",
        "character_states",
        ["character_id", "state_type", "state_key"],
    )


def downgrade() -> None:
    op.drop_index("ix_state_lookup", table_name="character_states")
    op.drop_index("ix_character_states_captured_at", table_name="character_states")
    op.drop_index("ix_character_states_state_type", table_name="character_states")
    op.drop_index("ix_character_states_chapter_id", table_name="character_states")
    op.drop_index("ix_character_states_character_id", table_name="character_states")
    op.drop_index("ix_character_states_work_id", table_name="character_states")
    op.drop_table("character_states")