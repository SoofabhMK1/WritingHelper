"""llm request logs

Revision ID: 0010_llm_request_logs
Revises: 0009_prompt_assemblies
Create Date: 2026-08-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_llm_request_logs"
down_revision: Union[str, None] = "0009_prompt_assemblies"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "llm_request_logs",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("prompt_name", sa.String(length=40), nullable=False),
        sa.Column("endpoint", sa.String(length=80), nullable=False),
        sa.Column(
            "work_id",
            sa.Integer(),
            sa.ForeignKey("works.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("system", sa.Text(), nullable=False, server_default=""),
        sa.Column("user", sa.Text(), nullable=False, server_default=""),
        sa.Column("response", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ok"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("model", sa.String(length=80), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_llm_request_logs_created_at",
        "llm_request_logs",
        ["created_at"],
    )
    op.create_index(
        "ix_llm_request_logs_work_created",
        "llm_request_logs",
        ["work_id", "created_at"],
    )
    op.create_index(
        "ix_llm_request_logs_prompt_created",
        "llm_request_logs",
        ["prompt_name", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_llm_request_logs_prompt_created", table_name="llm_request_logs")
    op.drop_index("ix_llm_request_logs_work_created", table_name="llm_request_logs")
    op.drop_index("ix_llm_request_logs_created_at", table_name="llm_request_logs")
    op.drop_table("llm_request_logs")
