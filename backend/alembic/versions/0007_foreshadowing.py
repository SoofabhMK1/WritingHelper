"""foreshadowing

Revision ID: 0007_foreshadowing
Revises: 0006_app_settings
Create Date: 2026-08-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_foreshadowing"
down_revision: Union[str, None] = "0006_app_settings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "foreshadowing",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("work_id", sa.Integer(), nullable=False),
        sa.Column("chapter_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("quote", sa.Text(), nullable=True),
        sa.Column("planted_chapter_id", sa.Integer(), nullable=True),
        sa.Column("payoff_chapter_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["work_id"], ["works.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["chapter_id"], ["chapters.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["planted_chapter_id"], ["chapters.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["payoff_chapter_id"], ["chapters.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_foreshadowing_work_id", "foreshadowing", ["work_id"])
    op.create_index("ix_foreshadowing_chapter_id", "foreshadowing", ["chapter_id"])
    op.create_index("ix_foreshadowing_status", "foreshadowing", ["status"])
    op.create_index("ix_foreshadow_lookup", "foreshadowing", ["work_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_foreshadow_lookup", table_name="foreshadowing")
    op.drop_index("ix_foreshadowing_status", table_name="foreshadowing")
    op.drop_index("ix_foreshadowing_chapter_id", table_name="foreshadowing")
    op.drop_index("ix_foreshadowing_work_id", table_name="foreshadowing")
    op.drop_table("foreshadowing")