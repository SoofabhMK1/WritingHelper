from enum import Enum
from typing import Optional

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ForeshadowStatus(str, Enum):
    OPEN = "open"            # 已埋,未收
    CLOSING = "closing"      # 即将收
    RESOLVED = "resolved"    # 已收


class Foreshadowing(Base, TimestampMixin):
    __tablename__ = "foreshadowing"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    work_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("works.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chapter_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quote: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    planted_chapter_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True
    )
    payoff_chapter_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(20), default=ForeshadowStatus.OPEN.value, nullable=False, index=True
    )

    __table_args__ = (Index("ix_foreshadow_lookup", "work_id", "status"),)