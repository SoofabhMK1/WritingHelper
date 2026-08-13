
from sqlalchemy import Boolean, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class AIServiceProfile(Base, TimestampMixin):
    """Saved OpenAI-compatible API configuration.

    A user may register many profiles (one per provider / account). Exactly
    one profile has ``is_default=True`` at a time; the service layer swaps
    the flag inside a single transaction to keep the invariant.
    """

    __tablename__ = "ai_service_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    base_url: Mapped[str] = mapped_column(String(200), nullable=False)
    api_key: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    temperature: Mapped[float] = mapped_column(Float, nullable=False, default=0.7)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)