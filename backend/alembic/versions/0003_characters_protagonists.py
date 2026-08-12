"""characters and protagonist profiles

Revision ID: 0003_characters_protagonists
Revises: 0002_volumes_chapters
Create Date: 2026-08-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_characters_protagonists"
down_revision: Union[str, None] = "0002_volumes_chapters"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "characters",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("work_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("aliases", sa.String(length=500), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="side"),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("gender", sa.String(length=40), nullable=True),
        sa.Column("appearance", sa.Text(), nullable=True),
        sa.Column("personality", sa.Text(), nullable=True),
        sa.Column("background", sa.Text(), nullable=True),
        sa.Column("motivation", sa.Text(), nullable=True),
        sa.Column("arc", sa.Text(), nullable=True),
        sa.Column("speech_style", sa.Text(), nullable=True),
        sa.Column("ability", sa.Text(), nullable=True),
        sa.Column("occupation", sa.String(length=120), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("avatar", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["work_id"], ["works.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_characters_work_id", "characters", ["work_id"])
    op.create_index("ix_characters_role", "characters", ["role"])
    op.create_index("ix_characters_name", "characters", ["name"])

    op.create_table(
        "protagonist_profiles",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("work_id", sa.Integer(), nullable=False),
        sa.Column("character_id", sa.Integer(), nullable=False),
        sa.Column("core_conflict", sa.Text(), nullable=True),
        sa.Column("external_goal", sa.Text(), nullable=True),
        sa.Column("internal_goal", sa.Text(), nullable=True),
        sa.Column("ghost", sa.Text(), nullable=True),
        sa.Column("wound", sa.Text(), nullable=True),
        sa.Column("lie_believed", sa.Text(), nullable=True),
        sa.Column("truth_needed", sa.Text(), nullable=True),
        sa.Column("arc_summary", sa.Text(), nullable=True),
        sa.Column("key_relationships", sa.Text(), nullable=True),
        sa.Column("special_abilities", sa.Text(), nullable=True),
        sa.Column("pov_label", sa.String(length=40), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["work_id"], ["works.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["character_id"], ["characters.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_protagonist_profiles_work_id", "protagonist_profiles", ["work_id"])
    op.create_index("ix_protagonist_profiles_character_id", "protagonist_profiles", ["character_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_protagonist_profiles_character_id", table_name="protagonist_profiles")
    op.drop_index("ix_protagonist_profiles_work_id", table_name="protagonist_profiles")
    op.drop_table("protagonist_profiles")
    op.drop_index("ix_characters_name", table_name="characters")
    op.drop_index("ix_characters_role", table_name="characters")
    op.drop_index("ix_characters_work_id", table_name="characters")
    op.drop_table("characters")