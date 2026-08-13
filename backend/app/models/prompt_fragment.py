
from sqlalchemy import Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class PromptFragment(Base, TimestampMixin):
    """A reusable snippet of prompt text.

    Fragments are global (not scoped under a work): the same snippet is useful
    across many compositions. Compositions reference fragments by id and
    splice their `body` into the rendered output.
    """

    __tablename__ = "prompt_fragments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (Index("ix_prompt_fragments_name", "name"),)