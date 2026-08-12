from typing import Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class AIPromptTemplateBinding(Base, TimestampMixin):
    """Maps a registered AI prompt (e.g. ``continue``) to a custom
    :class:`PromptAssembly`.

    One prompt has at most one binding; ``assembly_id`` is the FK into
    ``prompt_assemblies.id``. If the referenced assembly is deleted, the
    row is set to NULL (``ON DELETE SET NULL``) and the call falls back to
    the built-in template registered in ``app.ai.prompts.PROMPTS``.
    """

    __tablename__ = "ai_prompt_template_bindings"

    prompt_name: Mapped[str] = mapped_column(String(40), primary_key=True)
    assembly_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("prompt_assemblies.id", ondelete="SET NULL"),
        nullable=True,
    )
