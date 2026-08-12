from enum import Enum
from typing import Optional

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class StateType(str, Enum):
    PHYSICAL = "physical"      # 身体
    MENTAL = "mental"          # 心理
    LOCATION = "location"      # 位置
    RELATIONSHIP = "relationship"  # 关系
    WEALTH = "wealth"          # 财富
    SKILL = "skill"            # 技能
    CULTIVATION = "cultivation"  # 修为
    STATUS = "status"          # 身份/状态
    OTHER = "other"            # 其他


class CharacterState(Base, TimestampMixin):
    """通用 KV 状态记录。

    一行表示"在某章/某时点"某人物的某个维度状态值。
    通过 (character_id, state_type, state_key) 自然形成时间序列,
    同一人物同一维度可以有多个历史快照(不同 chapter_id / captured_at)。
    """

    __tablename__ = "character_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    work_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("works.id", ondelete="CASCADE"), nullable=False, index=True
    )
    character_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("characters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chapter_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("chapters.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    state_type: Mapped[str] = mapped_column(
        String(20), default=StateType.STATUS.value, nullable=False, index=True
    )
    state_key: Mapped[str] = mapped_column(String(80), nullable=False)
    state_value: Mapped[str] = mapped_column(String(500), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    captured_at: Mapped[Optional[str]] = mapped_column(String(40), nullable=True, index=True)

    __table_args__ = (
        Index("ix_state_lookup", "character_id", "state_type", "state_key"),
    )