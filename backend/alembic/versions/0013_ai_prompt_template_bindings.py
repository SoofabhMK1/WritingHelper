"""ai_prompt_template_bindings + llm_request_logs.prompt_assembly_id

Adds a new ``ai_prompt_template_bindings`` table that maps each registered
prompt name to an optional ``prompt_assemblies.id``. When the binding is
NULL (the default), the call uses the built-in template from
``app.ai.prompts.PROMPTS``. When set, the call renders the bound assembly
instead.

Adds ``prompt_assembly_id`` to ``llm_request_logs`` so the audit log can
show which template produced each row.

Revision ID: 0013_ai_prompt_template_bindings
Revises: 0012_llm_log_profile
Create Date: 2026-08-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0013_ai_prompt_template_bindings"
down_revision: Union[str, None] = "0012_llm_log_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_prompt_template_bindings",
        sa.Column("prompt_name", sa.String(length=40), nullable=False),
        sa.Column(
            "assembly_id",
            sa.Integer(),
            sa.ForeignKey("prompt_assemblies.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))"),
        ),
        sa.PrimaryKeyConstraint("prompt_name"),
    )

    # SQLite cannot ALTER TABLE to add a FK constraint; copy-and-move via batch.
    with op.batch_alter_table("llm_request_logs") as batch:
        batch.add_column(
            sa.Column("prompt_assembly_id", sa.Integer(), nullable=True)
        )
        batch.create_foreign_key(
            "fk_llm_request_logs_prompt_assembly_id",
            "prompt_assemblies",
            ["prompt_assembly_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("llm_request_logs") as batch:
        batch.drop_constraint(
            "fk_llm_request_logs_prompt_assembly_id", type_="foreignkey"
        )
        batch.drop_column("prompt_assembly_id")

    op.drop_table("ai_prompt_template_bindings")
