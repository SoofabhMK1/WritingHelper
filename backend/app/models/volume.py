from enum import Enum
from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class VolumeStatus(str, Enum):
    PLANNING = "planning"
    WRITING = "writing"
    DONE = "done"


class Volume(Base, TimestampMixin):
    __tablename__ = "volumes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    work_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("works.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_num: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default=VolumeStatus.PLANNING.value, nullable=False
    )
    target_words: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    chapters: Mapped[list["Chapter"]] = relationship(  # noqa: F821
        back_populates="volume",
        cascade="all, delete-orphan",
        order_by="Chapter.order_num",
        passive_deletes=True,
    )