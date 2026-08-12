from enum import Enum
from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ChapterStatus(str, Enum):
    PLANNING = "planning"
    DRAFTING = "drafting"
    WRITING = "writing"
    REVIEWING = "reviewing"
    DONE = "done"


class ChapterType(str, Enum):
    OPENING = "opening"
    PLOT = "plot"
    TRANSITIONAL = "transitional"
    CLIMAX = "climax"
    RESOLUTION = "resolution"
    EPILOGUE = "epilogue"
    INTERLUDE = "interlude"


class Chapter(Base, TimestampMixin):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    work_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("works.id", ondelete="CASCADE"), nullable=False, index=True
    )
    volume_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("volumes.id", ondelete="CASCADE"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    outline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_num: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    target_words: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    actual_words: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default=ChapterStatus.PLANNING.value, nullable=False, index=True
    )
    chapter_type: Mapped[str] = mapped_column(
        String(20), default=ChapterType.PLOT.value, nullable=False
    )
    mood: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)

    volume: Mapped[Optional["Volume"]] = relationship(  # noqa: F821
        back_populates="chapters"
    )