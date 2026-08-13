"""drop event_links.created_at (dead column)

Revision ID: 0014_drop_event_link_created_at
Revises: 0013_ai_prompt_template_bindings
Create Date: 2026-08-13
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0014_drop_event_link_created_at"
down_revision: Union[str, None] = "0013_ai_prompt_template_bindings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The created_at column on event_links was never populated and never read.
    # SQLite requires batch mode for any column drop with our schema layout.
    with op.batch_alter_table("event_links") as batch:
        batch.drop_column("created_at")


def downgrade() -> None:
    with op.batch_alter_table("event_links") as batch:
        batch.add_column(sa.Column("created_at", sa.String(length=40), nullable=True))