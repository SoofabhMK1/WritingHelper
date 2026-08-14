"""add free-form creation fields to works

Revision ID: 0017_work_creation_fields
Revises: 0016_drop_prompt_fragment_tags
Create Date: 2026-08-14
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0017_work_creation_fields"
down_revision: Union[str, None] = "0016_drop_prompt_fragment_tags"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("works") as batch:
        batch.add_column(sa.Column("story_seed", sa.Text(), nullable=True))
        batch.add_column(sa.Column("core_conflict", sa.Text(), nullable=True))
        batch.add_column(sa.Column("protagonist_goal", sa.Text(), nullable=True))
        batch.add_column(sa.Column("themes", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("era", sa.String(length=40), nullable=True))
        batch.add_column(sa.Column("setting", sa.Text(), nullable=True))
        batch.add_column(sa.Column("world_rules", sa.Text(), nullable=True))
        batch.add_column(sa.Column("pace", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("realism", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("prose", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("moods", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("length_type", sa.String(length=20), nullable=True))
        batch.add_column(sa.Column("stage", sa.String(length=40), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("works") as batch:
        batch.drop_column("stage")
        batch.drop_column("length_type")
        batch.drop_column("moods")
        batch.drop_column("prose")
        batch.drop_column("realism")
        batch.drop_column("pace")
        batch.drop_column("world_rules")
        batch.drop_column("setting")
        batch.drop_column("era")
        batch.drop_column("themes")
        batch.drop_column("protagonist_goal")
        batch.drop_column("core_conflict")
        batch.drop_column("story_seed")
