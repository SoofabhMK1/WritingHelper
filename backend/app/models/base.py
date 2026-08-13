from datetime import datetime

from sqlalchemy import DateTime, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))"),
        onupdate=text("(strftime('%Y-%m-%d %H:%M:%f', 'now'))"),
        nullable=False,
    )