from typing import Optional

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class PromptAssembly(Base, TimestampMixin):
    """A composition of prompt parts that renders to (system, user).

    Two ordered lists of parts: `system_parts_json` and `user_parts_json`,
    each stored as a JSON-encoded array of `Part` objects. `sample_vars_json`
    holds preview defaults for variable parts.

    Parts are not normalized into separate tables — they are an ordered
    sequence owned by the assembly, so a single JSON column is the right fit.
    """

    __tablename__ = "prompt_assemblies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    system_parts_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    user_parts_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    sample_vars_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")