from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class LlmRequestLog(Base, TimestampMixin):
    """审计日志:每次发出的 LLM 请求 + 回答。

    - ``work_id`` 使用 ``ON DELETE SET NULL``:工作被删除后,日志保留,
      仅清空外键引用(参考 ``character_states`` 的约定)。
    - ``profile_id`` 同理:已删除的 profile 不会级联清掉历史日志。
    - 大文本字段(system / user / response)以 TEXT 存储,详情页按需读取。
    - 列表页只读取 ``LlmRequestLogSummary`` schema 需要的字段,
      ``response`` / ``user`` 的截断预览在 service 层生成。
    """

    __tablename__ = "llm_request_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prompt_name: Mapped[str] = mapped_column(String(40), nullable=False)
    endpoint: Mapped[str] = mapped_column(String(80), nullable=False)
    work_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("works.id", ondelete="SET NULL"),
        nullable=True,
    )
    system: Mapped[str] = mapped_column(Text, nullable=False, default="")
    user: Mapped[str] = mapped_column(Text, nullable=False, default="")
    response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ok")
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    model: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    profile_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("ai_service_profiles.id", ondelete="SET NULL"),
        nullable=True,
    )
    provider: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    prompt_assembly_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("prompt_assemblies.id", ondelete="SET NULL"),
        nullable=True,
    )