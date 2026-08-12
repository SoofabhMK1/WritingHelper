from enum import Enum
from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CharacterRole(str, Enum):
    PROTAGONIST = "protagonist"
    DEUTERAGONIST = "deuteragonist"
    SUPPORT = "support"
    ANTAGONIST = "antagonist"
    MENTOR = "mentor"
    LOVE_INTEREST = "love_interest"
    SIDE = "side"
    NPC = "npc"


class Character(Base, TimestampMixin):
    __tablename__ = "characters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    work_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("works.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    aliases: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    role: Mapped[str] = mapped_column(
        String(20), default=CharacterRole.SIDE.value, nullable=False, index=True
    )
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    appearance: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    personality: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    background: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    motivation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    arc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    speech_style: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ability: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    occupation: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    protagonist_profile: Mapped[Optional["ProtagonistProfile"]] = relationship(  # noqa: F821
        back_populates="character",
        cascade="all, delete-orphan",
        uselist=False,
        passive_deletes=True,
    )