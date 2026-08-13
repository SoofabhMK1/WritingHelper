from enum import Enum

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class WorkStatus(str, Enum):
    DRAFT = "draft"
    WRITING = "writing"
    PAUSED = "paused"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class Work(Base, TimestampMixin):
    __tablename__ = "works"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    subtitle: Mapped[str | None] = mapped_column(String(200), nullable=True)
    genre: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    style: Mapped[str | None] = mapped_column(String(80), nullable=True)
    pov: Mapped[str | None] = mapped_column(String(40), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_words: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_words: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        default=WorkStatus.DRAFT.value,
        nullable=False,
        index=True,
    )
    cover: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)