"""volumes and chapters

Revision ID: 0002_volumes_chapters
Revises: 0001_initial
Create Date: 2026-08-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_volumes_chapters"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "volumes",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("work_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("order_num", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="planning"),
        sa.Column("target_words", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["work_id"], ["works.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_volumes_work_id", "volumes", ["work_id"])

    op.create_table(
        "chapters",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("work_id", sa.Integer(), nullable=False),
        sa.Column("volume_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("outline", sa.Text(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("order_num", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("target_words", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("actual_words", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="planning"),
        sa.Column("chapter_type", sa.String(length=20), nullable=False, server_default="plot"),
        sa.Column("mood", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["work_id"], ["works.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["volume_id"], ["volumes.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_chapters_work_id", "chapters", ["work_id"])
    op.create_index("ix_chapters_volume_id", "chapters", ["volume_id"])
    op.create_index("ix_chapters_status", "chapters", ["status"])


def downgrade() -> None:
    op.drop_index("ix_chapters_status", table_name="chapters")
    op.drop_index("ix_chapters_volume_id", table_name="chapters")
    op.drop_index("ix_chapters_work_id", table_name="chapters")
    op.drop_table("chapters")
    op.drop_index("ix_volumes_work_id", table_name="volumes")
    op.drop_table("volumes")