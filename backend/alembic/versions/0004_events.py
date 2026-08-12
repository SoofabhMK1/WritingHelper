"""events / event_characters / event_links

Revision ID: 0004_events
Revises: 0003_characters_protagonists
Create Date: 2026-08-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_events"
down_revision: Union[str, None] = "0003_characters_protagonists"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("work_id", sa.Integer(), nullable=False),
        sa.Column("chapter_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("event_type", sa.String(length=20), nullable=False, server_default="main"),
        sa.Column("story_time", sa.String(length=120), nullable=True),
        sa.Column("location", sa.String(length=120), nullable=True),
        sa.Column("importance", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="planned"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["work_id"], ["works.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["chapter_id"], ["chapters.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_events_work_id", "events", ["work_id"])
    op.create_index("ix_events_chapter_id", "events", ["chapter_id"])
    op.create_index("ix_events_event_type", "events", ["event_type"])
    op.create_index("ix_events_story_time", "events", ["story_time"])
    op.create_index("ix_events_status", "events", ["status"])

    op.create_table(
        "event_characters",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("character_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False, server_default="participant"),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["character_id"], ["characters.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("event_id", "character_id", name="uq_event_character"),
    )
    op.create_index("ix_event_characters_event_id", "event_characters", ["event_id"])
    op.create_index("ix_event_characters_character_id", "event_characters", ["character_id"])

    op.create_table(
        "event_links",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("work_id", sa.Integer(), nullable=False),
        sa.Column("source_event_id", sa.Integer(), nullable=False),
        sa.Column("target_event_id", sa.Integer(), nullable=False),
        sa.Column("link_type", sa.String(length=20), nullable=False, server_default="causes"),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.String(length=40), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["work_id"], ["works.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_event_id"], ["events.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("source_event_id", "target_event_id", "link_type", name="uq_event_link"),
    )
    op.create_index("ix_event_links_work_id", "event_links", ["work_id"])
    op.create_index("ix_event_links_source_event_id", "event_links", ["source_event_id"])
    op.create_index("ix_event_links_target_event_id", "event_links", ["target_event_id"])


def downgrade() -> None:
    op.drop_index("ix_event_links_target_event_id", table_name="event_links")
    op.drop_index("ix_event_links_source_event_id", table_name="event_links")
    op.drop_index("ix_event_links_work_id", table_name="event_links")
    op.drop_table("event_links")
    op.drop_index("ix_event_characters_character_id", table_name="event_characters")
    op.drop_index("ix_event_characters_event_id", table_name="event_characters")
    op.drop_table("event_characters")
    op.drop_index("ix_events_status", table_name="events")
    op.drop_index("ix_events_story_time", table_name="events")
    op.drop_index("ix_events_event_type", table_name="events")
    op.drop_index("ix_events_chapter_id", table_name="events")
    op.drop_index("ix_events_work_id", table_name="events")
    op.drop_table("events")