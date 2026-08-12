from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ProtagonistProfile(Base, TimestampMixin):
    """编剧学框架的主角深度设定(挂在 character_id 上)。

    一部作品可以有多个主角(多 POV),每个主角一份 profile。
    """

    __tablename__ = "protagonist_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    work_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("works.id", ondelete="CASCADE"), nullable=False, index=True
    )
    character_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("characters.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    core_conflict: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    external_goal: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    internal_goal: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ghost: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    wound: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lie_believed: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    truth_needed: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    arc_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    key_relationships: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    special_abilities: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pov_label: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

    character: Mapped["Character"] = relationship(  # noqa: F821
        back_populates="protagonist_profile"
    )