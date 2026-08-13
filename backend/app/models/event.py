from enum import Enum

from sqlalchemy import ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class EventType(str, Enum):
    MAIN = "main"
    BRANCH = "branch"
    FORESHADOW = "foreshadow"
    CLIMAX = "climax"
    BACKSTORY = "backstory"
    REVEAL = "reveal"


class EventStatus(str, Enum):
    PLANNED = "planned"
    ACTIVE = "active"
    RESOLVED = "resolved"
    ABANDONED = "abandoned"


class Event(Base, TimestampMixin):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    work_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("works.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chapter_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_type: Mapped[str] = mapped_column(
        String(20), default=EventType.MAIN.value, nullable=False, index=True
    )
    story_time: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    importance: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default=EventStatus.PLANNED.value, nullable=False, index=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    character_links: Mapped[list["EventCharacter"]] = relationship(  # noqa: F821
        back_populates="event",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class EventCharacter(Base):
    __tablename__ = "event_characters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    character_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("characters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(40), default="participant", nullable=False)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)

    event: Mapped["Event"] = relationship(back_populates="character_links")

    __table_args__ = (UniqueConstraint("event_id", "character_id", name="uq_event_character"),)


class EventLinkType(str, Enum):
    CAUSES = "causes"
    BLOCKS = "blocks"
    ENABLES = "enables"
    CONTRASTS = "contrasts"
    PARALLELS = "parallels"


class EventLink(Base):
    __tablename__ = "event_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # ``work_id`` is denormalized from ``source_event.work_id`` for query
    # speed: ``GET /works/{w}/events/{e}/links`` and the in/out link
    # queries in ``get_event`` both filter by it. Insert paths verify the
    # invariant via ``_get_event_or_404`` in ``app/api/v1/events.py``.
    work_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("works.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_event_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_event_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    link_type: Mapped[str] = mapped_column(String(20), default=EventLinkType.CAUSES.value, nullable=False)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)

    __table_args__ = (
        UniqueConstraint("source_event_id", "target_event_id", "link_type", name="uq_event_link"),
        Index("ix_event_link_pair", "source_event_id", "target_event_id"),
    )