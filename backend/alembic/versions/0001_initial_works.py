"""initial works table

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "works",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("subtitle", sa.String(length=200), nullable=True),
        sa.Column("genre", sa.String(length=80), nullable=True),
        sa.Column("style", sa.String(length=80), nullable=True),
        sa.Column("pov", sa.String(length=40), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("target_words", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_words", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("cover", sa.String(length=500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_works_title", "works", ["title"])
    op.create_index("ix_works_genre", "works", ["genre"])
    op.create_index("ix_works_status", "works", ["status"])


def downgrade() -> None:
    op.drop_index("ix_works_status", table_name="works")
    op.drop_index("ix_works_genre", table_name="works")
    op.drop_index("ix_works_title", table_name="works")
    op.drop_table("works")