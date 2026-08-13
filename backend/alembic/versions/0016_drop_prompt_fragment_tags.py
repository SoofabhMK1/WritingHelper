"""drop prompt_fragments.tags_json (dead column)

Revision ID: 0016_drop_prompt_fragment_tags
Revises: 0015_ai_profile_api_key_cap
Create Date: 2026-08-13
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0016_drop_prompt_fragment_tags"
down_revision: Union[str, None] = "0015_ai_profile_api_key_cap"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("prompt_fragments") as batch:
        batch.drop_column("tags_json")


def downgrade() -> None:
    import sqlalchemy as sa

    with op.batch_alter_table("prompt_fragments") as batch:
        batch.add_column(sa.Column("tags_json", sa.Text(), nullable=True))