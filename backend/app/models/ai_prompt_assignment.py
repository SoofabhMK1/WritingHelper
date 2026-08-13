
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class AIPromptAssignment(Base, TimestampMixin):
    """Maps a registered AI prompt (e.g. ``continue``) to a saved profile.

    One prompt has at most one profile; ``profile_id`` is the FK into
    ``ai_service_profiles.id``. If the referenced profile is deleted, the
    row is set to NULL (``ON DELETE SET NULL``) and the call falls back to
    the default profile.
    """

    __tablename__ = "ai_prompt_assignments"

    prompt_name: Mapped[str] = mapped_column(String(40), primary_key=True)
    profile_id: Mapped[int | None] = mapped_column(
        ForeignKey("ai_service_profiles.id", ondelete="SET NULL"),
        nullable=True,
    )